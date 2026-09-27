import { randomUUID } from 'node:crypto';
import { Clock } from '../../shared/time/index.js';
import { GameError } from '../../shared/engine/index.js';
import { GameSession } from './GameSession.js';
import { ServiceError, ERRORS } from './errors.js';
import { systemScheduler } from './ports.js';

const opposite = (c) => (c === 'w' ? 'b' : 'w');

/**
 * Các use case của trò chơi. GameService chỉ phụ thuộc vào abstraction được
 * tiêm vào (repository, registries, scheduler, clock, bus) — nguyên tắc 1.
 *
 * Nó KHÔNG gửi tin nhắn mạng, không ghi log, không lưu PGN, không điều khiển bot:
 * nó chỉ công bố sự kiện nghiệp vụ lên bus (nguyên tắc 4):
 *
 *   game.created   { session }             game.started  { session }
 *   game.moved     { session, record }     game.ended    { session, result }
 *   game.updated   { session }             (mọi thay đổi trạng thái, đã gộp theo microtask)
 *   game.removed   { session }             draw.offered  { session, by }
 *   chat.posted    { session, from, text, at }
 *   lobby.changed  {}
 */
export class GameService {
  constructor({
    repository,
    variants,
    timeControls,
    clockKinds,
    bus,
    scheduler = systemScheduler,
    now = () => Date.now(),
    newId = () => randomUUID().slice(0, 8),
  }) {
    Object.assign(this, { repository, variants, timeControls, clockKinds, bus, scheduler, now, newId });
    this._flagTimers = new Map();
    this._pendingUpdates = new Set();
  }

  async create({ player, variantId, timeControlId, color = 'random' }) {
    const variant = this.#lookup(this.variants, variantId, 'variant');
    const timeControl = this.#lookup(this.timeControls, timeControlId, 'time control');
    const session = new GameSession({
      id: this.newId(),
      variant,
      timeControl,
      clock: new Clock({ control: timeControl, kinds: this.clockKinds, now: this.now }),
      createdBy: player.id,
      createdAt: this.now(),
    });
    const seat = color === 'w' || color === 'b' ? color : Math.random() < 0.5 ? 'w' : 'b';
    session.seat(seat, player);
    this.#wire(session);
    await this.repository.save(session);
    this.bus.emit('game.created', { session });
    this.#changed(session);
    return session;
  }

  async join({ player, gameId }) {
    const session = await this.#get(gameId);
    if (session.colorOf(player.id)) return session;
    const seat = session.freeSeat();
    if (!seat || session.status !== 'waiting') throw new ServiceError(ERRORS.CONFLICT, 'Phòng đã đủ người');
    session.seat(seat, player);
    if (session.isFull) this.#start(session);
    await this.repository.save(session);
    this.#changed(session);
    return session;
  }

  async watch({ player, gameId }) {
    const session = await this.#get(gameId);
    if (!session.colorOf(player.id)) session.spectators.add(player.id);
    this.#changed(session);
    return session;
  }

  async leave({ player, gameId }) {
    const session = await this.#get(gameId);
    if (session.spectators.delete(player.id)) {
      this.#changed(session);
    } else if (session.status === 'waiting' && session.colorOf(player.id)) {
      await this.remove(session);
    }
  }

  async remove(session) {
    this.#clearFlagTimer(session);
    await this.repository.delete(session.id);
    this.bus.emit('game.removed', { session });
    this.bus.emit('lobby.changed', {});
  }

  async move({ player, gameId, uci }) {
    const session = await this.#get(gameId);
    const color = this.#requireSeat(session, player);
    if (session.status !== 'active') throw new ServiceError(ERRORS.GAME_OVER, 'Ván cờ chưa bắt đầu hoặc đã kết thúc');
    if (this.#checkFlag(session)) throw new ServiceError(ERRORS.GAME_OVER, 'Hết giờ');
    if (session.game.turn !== color) throw new ServiceError(ERRORS.NOT_YOUR_TURN, 'Chưa tới lượt bạn');
    try {
      session.game.play(uci);
    } catch (err) {
      if (err instanceof GameError) throw new ServiceError(err.code, err.message);
      throw err;
    }
    if (!session.game.isOver) {
      session.clock.press();
      session.drawOffer = null; // đi một nước = từ chối lời mời hoà đang chờ
      this.#armFlagTimer(session);
    }
    await this.repository.save(session);
    this.#changed(session);
    return session;
  }

  async resign({ player, gameId }) {
    const session = await this.#get(gameId);
    const color = this.#requireSeat(session, player);
    if (session.status === 'waiting') return this.remove(session);
    if (session.status !== 'active') throw new ServiceError(ERRORS.GAME_OVER);
    session.game.end({ winner: opposite(color), reason: 'resignation' });
    await this.repository.save(session);
  }

  async offerDraw({ player, gameId }) {
    const session = await this.#get(gameId);
    const color = this.#requireSeat(session, player);
    if (session.status !== 'active') throw new ServiceError(ERRORS.GAME_OVER);
    if (session.drawOffer === opposite(color)) return this.respondDraw({ player, gameId, accept: true });
    session.drawOffer = color;
    this.bus.emit('draw.offered', { session, by: color });
    this.#changed(session);
  }

  async respondDraw({ player, gameId, accept }) {
    const session = await this.#get(gameId);
    const color = this.#requireSeat(session, player);
    if (session.status !== 'active') throw new ServiceError(ERRORS.GAME_OVER);
    if (session.drawOffer !== opposite(color)) throw new ServiceError(ERRORS.CONFLICT, 'Không có lời mời hoà');
    if (accept) session.game.end({ winner: null, reason: 'agreement' });
    else session.drawOffer = null;
    await this.repository.save(session);
    this.#changed(session);
  }

  async chat({ player, gameId, text }) {
    const session = await this.#get(gameId);
    const clean = String(text).trim().slice(0, 300);
    if (!clean) return;
    if (!session.participants().includes(player.id)) throw new ServiceError(ERRORS.FORBIDDEN);
    this.bus.emit('chat.posted', { session, from: { id: player.id, name: player.name }, text: clean, at: this.now() });
  }

  async get(gameId) {
    return this.#get(gameId);
  }

  async list() {
    return this.repository.list();
  }

  // ---- nội bộ -------------------------------------------------------------

  #wire(session) {
    session.game.events.on('moved', ({ record }) => this.bus.emit('game.moved', { session, record }));
    session.game.events.on('ended', ({ result }) => {
      session.status = 'ended';
      session.endedAt = this.now();
      session.drawOffer = null;
      session.clock.stop();
      this.#clearFlagTimer(session);
      this.bus.emit('game.ended', { session, result });
      this.#changed(session);
    });
  }

  #start(session) {
    session.status = 'active';
    session.clock.start('w');
    this.#armFlagTimer(session);
    this.bus.emit('game.started', { session });
  }

  /** Gộp nhiều thay đổi trong cùng một tick thành một sự kiện game.updated. */
  #changed(session) {
    if (this._pendingUpdates.has(session)) return;
    this._pendingUpdates.add(session);
    queueMicrotask(() => {
      this._pendingUpdates.delete(session);
      this.bus.emit('game.updated', { session });
      this.bus.emit('lobby.changed', {});
    });
  }

  #checkFlag(session) {
    const flagged = session.clock.flagged();
    if (!flagged || session.game.isOver) return false;
    const opponent = opposite(flagged);
    const engine = session.game.engine;
    const canMate = [...session.game.position.pieces(opponent)].some(([, p]) => !engine.pieceDef(p.type).royal);
    session.game.end(canMate ? { winner: opponent, reason: 'timeout' } : { winner: null, reason: 'timeout_insufficient' });
    return true;
  }

  #armFlagTimer(session) {
    this.#clearFlagTimer(session);
    const ms = session.clock.msUntilFlag();
    if (!Number.isFinite(ms)) return;
    const handle = this.scheduler.setTimeout(() => {
      this._flagTimers.delete(session.id);
      if (this.#checkFlag(session)) this.repository.save(session);
      else if (!session.game.isOver) this.#armFlagTimer(session);
    }, ms + 5);
    this._flagTimers.set(session.id, handle);
  }

  #clearFlagTimer(session) {
    const handle = this._flagTimers.get(session.id);
    if (handle !== undefined) this.scheduler.clearTimeout(handle);
    this._flagTimers.delete(session.id);
  }

  async #get(gameId) {
    const session = await this.repository.get(gameId);
    if (!session) throw new ServiceError(ERRORS.NOT_FOUND, 'Không tìm thấy ván cờ');
    return session;
  }

  #requireSeat(session, player) {
    const color = session.colorOf(player.id);
    if (!color) throw new ServiceError(ERRORS.FORBIDDEN, 'Bạn không phải người chơi của ván này');
    return color;
  }

  #lookup(registry, id, what) {
    const item = registry.find(id);
    if (!item) throw new ServiceError(ERRORS.INVALID_PAYLOAD, `Unknown ${what} "${id}"`);
    return item;
  }

  dispose() {
    for (const handle of this._flagTimers.values()) this.scheduler.clearTimeout(handle);
    this._flagTimers.clear();
  }
}
