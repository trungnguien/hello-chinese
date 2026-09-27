/**
 * Một phòng chơi của BẤT KỲ game nào: module + ván (match) + ghế + đồng hồ + khán giả.
 * Là trạng thái thuần — không gửi mạng, không lưu trữ, không biết luật game.
 */
export class Room {
  constructor({ id, module, options, match, timeControl, clock, createdBy, createdAt }) {
    this.id = id;
    this.module = module;
    this.options = options;
    this.match = match;
    this.timeControl = timeControl;
    this.clock = clock;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.endedAt = null;
    /** Ghế lấy từ manifest: { w: null, b: null } hoặc { x: null, o: null }... */
    this.players = Object.fromEntries(module.manifest.seats.map((s) => [s.id, null]));
    this.spectators = new Set();
    this.status = 'waiting';
    this.drawOffer = null;
    this.result = null;
    /** Nhật ký hành động — đủ để phát lại ván (replay) vì module là tất định. */
    this.actions = [];
    /** Nhật ký hiển thị: [{ seat, text }]. */
    this.log = [];
    /** Chỗ cho plugin gắn dữ liệu riêng mà không sửa lớp này (nguyên tắc 7). */
    this.meta = {};
  }

  get gameId() {
    return this.module.manifest.id;
  }

  get seatIds() {
    return Object.keys(this.players);
  }

  seatOf(playerId) {
    return this.seatIds.find((seat) => this.players[seat]?.id === playerId) ?? null;
  }

  freeSeat() {
    return this.seatIds.find((seat) => !this.players[seat]) ?? null;
  }

  seat(seatId, player) {
    this.players[seatId] = player;
    this.spectators.delete(player.id);
  }

  get isFull() {
    return this.seatIds.every((seat) => this.players[seat]);
  }

  participants() {
    const ids = new Set(this.spectators);
    for (const p of Object.values(this.players)) if (p) ids.add(p.id);
    return [...ids];
  }

  opponentsOf(seatId) {
    return this.seatIds.filter((s) => s !== seatId);
  }
}
