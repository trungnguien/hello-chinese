import { randomUUID } from 'node:crypto';
import { Clock } from '../../shared/time/index.js';
import { seededRandom } from '../../shared/random.js';
import { assertMatch, resolveOptions } from '../../shared/gameModule.js';
import { Room } from './Room.js';
import { ServiceError, ERRORS } from './errors.js';
import { systemScheduler } from './ports.js';

const UNTIMED = Object.freeze({ id: 'untimed', label: 'Không giới hạn', kind: 'untimed' });
/** Mã lỗi luật chơi mà module được phép trả thẳng cho client. */
const RULE_CODES = new Set([ERRORS.ILLEGAL_ACTION, ERRORS.ILLEGAL_MOVE, ERRORS.NOT_YOUR_TURN, ERRORS.GAME_OVER]);

/**
 * Use case phòng chơi cho MỌI game. RoomService chỉ biết GameModule contract
 * (shared/gameModule.js) — không một dòng nào nói về quân cờ, bàn caro... (nguyên tắc 1).
 *
 * Nó chỉ công bố sự kiện (nguyên tắc 4):
 *   room.created  { room }                         room.started  { room }
 *   room.acted    { room, seat, action, text, notes }
 *   room.ended    { room, result }                 room.removed  { room }
 *   room.updated  { room }  (mọi thay đổi, đã gộp theo microtask)
 *   draw.offered  { room, by }                     chat.posted   { room, from, text, at }
 *   lobby.changed {}
 */
export class RoomService {
  constructor({
    repository,
    games,
    timeControls,
    clockKinds,
    bus,
    scheduler = systemScheduler,
    now = () => Date.now(),
    newId = () => randomUUID().slice(0, 8),
    newSeed = () => Math.floor(Math.random() * 2 ** 32),
  }) {
    Object.assign(this, { repository, games, timeControls, clockKinds, bus, scheduler, now, newId, newSeed });
    this._flagTimers = new Map();
    this._pendingUpdates = new Set();
  }

  async create({ player, gameId, options, timeControlId, seat = 'random' }) {
    const module = this.games.find(gameId);
    if (!module) throw new ServiceError(ERRORS.INVALID_PAYLOAD, `Unknown game "${gameId}"`);
    const { manifest } = module;
    const resolved = resolveOptions(manifest, options);
    const timeControl = manifest.capabilities?.clock ? this.#timeControl(timeControlId) : UNTIMED;
    const seats = manifest.seats.map((s) => s.id);
    const seed = this.newSeed();
    const room = new Room({
      id: this.newId(),
      module,
      options: resolved,
      match: assertMatch(module.createMatch({ options: resolved, seats, rng: seededRandom(seed) }), gameId),
      timeControl,
      clock: new Clock({ control: timeControl, seats, kinds: this.clockKinds, now: this.now }),
      createdBy: player.id,
      createdAt: this.now(),
    });
    room.meta.seed = seed;
    const chosen = seats.includes(seat) ? seat : seats[Math.floor(Math.random() * seats.length)];
    room.seat(chosen, player);
    await this.repository.save(room);
    this.bus.emit('room.created', { room });
    this.#changed(room);
    return room;
  }

  async join({ player, roomId }) {
    const room = await this.#get(roomId);
    if (room.seatOf(player.id)) return room;
    const seat = room.freeSeat();
    if (!seat || room.status !== 'waiting') throw new ServiceError(ERRORS.CONFLICT, 'Phòng đã đủ người');
    room.seat(seat, player);
    if (room.isFull) this.#start(room);
    await this.repository.save(room);
    this.#changed(room);
    return room;
  }

  async watch({ player, roomId }) {
    const room = await this.#get(roomId);
    if (!room.seatOf(player.id)) room.spectators.add(player.id);
    this.#changed(room);
    return room;
  }

  async leave({ player, roomId }) {
    const room = await this.#get(roomId);
    if (room.spectators.delete(player.id)) this.#changed(room);
    else if (room.status === 'waiting' && room.seatOf(player.id)) await this.remove(room);
  }

  async remove(room) {
    this.#clearFlagTimer(room);
    await this.repository.delete(room.id);
    this.bus.emit('room.removed', { room });
    this.bus.emit('lobby.changed', {});
  }

  async act({ player, roomId, action }) {
    const room = await this.#get(roomId);
    const seat = this.#requireSeat(room, player);
    if (room.status !== 'active') throw new ServiceError(ERRORS.GAME_OVER, 'Ván chưa bắt đầu hoặc đã kết thúc');
    if (this.#checkFlag(room)) throw new ServiceError(ERRORS.GAME_OVER, 'Hết giờ');
    if (!room.match.activeSeats().includes(seat)) throw new ServiceError(ERRORS.NOT_YOUR_TURN, 'Chưa tới lượt bạn');

    let outcome;
    try {
      outcome = room.match.act(seat, action) ?? {};
    } catch (err) {
      if (!err.code) throw err;
      throw new ServiceError(RULE_CODES.has(err.code) ? err.code : ERRORS.ILLEGAL_ACTION, err.message);
    }
    room.actions.push({ seat, action });
    room.log.push({ seat, text: outcome.text ?? '' });
    this.bus.emit('room.acted', { room, seat, action, text: outcome.text, notes: outcome.notes ?? [] });

    const result = room.match.outcome();
    if (result) this.#end(room, result);
    else {
      const [next] = room.match.activeSeats();
      room.clock.press(next);
      room.drawOffer = null; // hành động = từ chối lời mời hoà đang chờ
      this.#armFlagTimer(room);
    }
    await this.repository.save(room);
    this.#changed(room);
    return room;
  }

  async resign({ player, roomId }) {
    const room = await this.#get(roomId);
    const seat = this.#requireSeat(room, player);
    if (room.status === 'waiting') return this.remove(room);
    if (room.status !== 'active') throw new ServiceError(ERRORS.GAME_OVER);
    this.#end(room, { winners: room.opponentsOf(seat), reason: 'resignation' });
    await this.repository.save(room);
  }

  /** Mời hoà: dành cho game khai báo capability drawOffers (hiện dùng cho 2 người). */
  async offerDraw({ player, roomId }) {
    const room = await this.#get(roomId);
    const seat = this.#requireSeat(room, player);
    this.#requireCapability(room, 'drawOffers');
    if (room.status !== 'active') throw new ServiceError(ERRORS.GAME_OVER);
    if (room.drawOffer && room.drawOffer !== seat) return this.respondDraw({ player, roomId, accept: true });
    room.drawOffer = seat;
    this.bus.emit('draw.offered', { room, by: seat });
    this.#changed(room);
  }

  async respondDraw({ player, roomId, accept }) {
    const room = await this.#get(roomId);
    const seat = this.#requireSeat(room, player);
    if (room.status !== 'active') throw new ServiceError(ERRORS.GAME_OVER);
    if (!room.drawOffer || room.drawOffer === seat) throw new ServiceError(ERRORS.CONFLICT, 'Không có lời mời hoà');
    if (accept) this.#end(room, { winners: [], reason: 'agreement' });
    else room.drawOffer = null;
    await this.repository.save(room);
    this.#changed(room);
  }

  async chat({ player, roomId, text }) {
    const room = await this.#get(roomId);
    const clean = String(text).trim().slice(0, 300);
    if (!clean) return;
    if (!room.participants().includes(player.id)) throw new ServiceError(ERRORS.FORBIDDEN);
    this.bus.emit('chat.posted', { room, from: { id: player.id, name: player.name }, text: clean, at: this.now() });
  }

  async get(roomId) {
    return this.#get(roomId);
  }

  async list() {
    return this.repository.list();
  }

  dispose() {
    for (const handle of this._flagTimers.values()) this.scheduler.clearTimeout(handle);
    this._flagTimers.clear();
  }

  // ---- nội bộ -------------------------------------------------------------

  #start(room) {
    room.status = 'active';
    const [first] = room.match.activeSeats();
    if (first) room.clock.start(first);
    this.#armFlagTimer(room);
    this.bus.emit('room.started', { room });
  }

  #end(room, result) {
    if (room.status === 'ended') return;
    room.status = 'ended';
    room.result = { winners: result.winners ?? [], reason: result.reason };
    room.endedAt = this.now();
    room.drawOffer = null;
    room.clock.stop();
    this.#clearFlagTimer(room);
    this.bus.emit('room.ended', { room, result: room.result });
    this.#changed(room);
  }

  /** Gộp nhiều thay đổi trong cùng một tick thành một sự kiện room.updated. */
  #changed(room) {
    if (this._pendingUpdates.has(room)) return;
    this._pendingUpdates.add(room);
    queueMicrotask(() => {
      this._pendingUpdates.delete(room);
      this.bus.emit('room.updated', { room });
      this.bus.emit('lobby.changed', {});
    });
  }

  #checkFlag(room) {
    const flagged = room.clock.flagged();
    if (!flagged || room.status !== 'active') return false;
    const outcome = room.match.timeoutOutcome?.(flagged) ?? { winners: room.opponentsOf(flagged), reason: 'timeout' };
    this.#end(room, outcome);
    return true;
  }

  #armFlagTimer(room) {
    this.#clearFlagTimer(room);
    const ms = room.clock.msUntilFlag();
    if (!Number.isFinite(ms)) return;
    const handle = this.scheduler.setTimeout(() => {
      this._flagTimers.delete(room.id);
      if (this.#checkFlag(room)) this.repository.save(room);
      else if (room.status === 'active') this.#armFlagTimer(room);
    }, ms + 5);
    this._flagTimers.set(room.id, handle);
  }

  #clearFlagTimer(room) {
    const handle = this._flagTimers.get(room.id);
    if (handle !== undefined) this.scheduler.clearTimeout(handle);
    this._flagTimers.delete(room.id);
  }

  #timeControl(id) {
    if (!id || id === UNTIMED.id) return this.timeControls.find(UNTIMED.id) ?? UNTIMED;
    const tc = this.timeControls.find(id);
    if (!tc) throw new ServiceError(ERRORS.INVALID_PAYLOAD, `Unknown time control "${id}"`);
    return tc;
  }

  async #get(roomId) {
    const room = await this.repository.get(roomId);
    if (!room) throw new ServiceError(ERRORS.NOT_FOUND, 'Không tìm thấy phòng');
    return room;
  }

  #requireSeat(room, player) {
    const seat = room.seatOf(player.id);
    if (!seat) throw new ServiceError(ERRORS.FORBIDDEN, 'Bạn không phải người chơi của phòng này');
    return seat;
  }

  #requireCapability(room, name) {
    if (!room.module.manifest.capabilities?.[name]) {
      throw new ServiceError(ERRORS.UNSUPPORTED, `Game "${room.gameId}" không hỗ trợ ${name}`);
    }
  }
}
