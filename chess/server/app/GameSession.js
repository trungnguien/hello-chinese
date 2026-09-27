import { Game } from '../../shared/engine/index.js';

/**
 * Một phòng chơi: ván cờ + người chơi + đồng hồ + khán giả.
 * Là trạng thái thuần — không gửi mạng, không lưu trữ.
 */
export class GameSession {
  constructor({ id, variant, timeControl, clock, createdBy, createdAt }) {
    this.id = id;
    this.variant = variant;
    this.timeControl = timeControl;
    this.clock = clock;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.endedAt = null;
    this.game = new Game({ variant });
    this.players = { w: null, b: null };
    this.spectators = new Set();
    this.status = 'waiting';
    this.drawOffer = null;
    /** Chỗ cho plugin gắn dữ liệu riêng mà không sửa lớp này (nguyên tắc 7). */
    this.meta = {};
  }

  colorOf(playerId) {
    if (this.players.w?.id === playerId) return 'w';
    if (this.players.b?.id === playerId) return 'b';
    return null;
  }

  freeSeat() {
    if (!this.players.w) return 'w';
    if (!this.players.b) return 'b';
    return null;
  }

  seat(color, player) {
    this.players[color] = player;
    this.spectators.delete(player.id);
  }

  get isFull() {
    return Boolean(this.players.w && this.players.b);
  }

  participants() {
    const ids = new Set(this.spectators);
    if (this.players.w) ids.add(this.players.w.id);
    if (this.players.b) ids.add(this.players.b.id);
    return [...ids];
  }
}
