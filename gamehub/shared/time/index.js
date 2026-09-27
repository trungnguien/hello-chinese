import { Registry } from '../core/Registry.js';

/**
 * Các kiểu kiểm soát thời gian. Một "time control" cụ thể là DỮ LIỆU:
 *   { id: 'blitz-3+2', label: '3+2', kind: 'fischer', initialMs: 180000, incrementMs: 2000 }
 * còn `kind` trỏ tới chiến lược dưới đây (late binding).
 *
 * Contract của một kind:
 *   timed: boolean
 *   initial(tc)                 -> ms ban đầu của mỗi bên
 *   charge(elapsedMs, tc)       -> ms thực sự bị trừ cho một lượt
 *   bonus(tc)                   -> ms cộng thêm sau khi đi xong
 */
export const timeControlKinds = new Registry('time control kind');

timeControlKinds.register('untimed', {
  timed: false,
  initial: () => Infinity,
  charge: () => 0,
  bonus: () => 0,
});

/** Fischer: mỗi nước đi được cộng thêm increment. */
timeControlKinds.register('fischer', {
  timed: true,
  initial: (tc) => tc.initialMs,
  charge: (elapsed) => elapsed,
  bonus: (tc) => tc.incrementMs ?? 0,
});

/** Simple delay (US delay): không trừ giờ trong `delayMs` đầu tiên của mỗi lượt. */
timeControlKinds.register('delay', {
  timed: true,
  initial: (tc) => tc.initialMs,
  charge: (elapsed, tc) => Math.max(0, elapsed - (tc.delayMs ?? 0)),
  bonus: () => 0,
});

/**
 * Đồng hồ theo GHẾ (seat) — dùng cho mọi game theo lượt, không chỉ Trắng/Đen.
 * Nguồn thời gian `now` được tiêm vào (nguyên tắc 1) để test được.
 */
export class Clock {
  constructor({ control, seats = ['w', 'b'], kinds = timeControlKinds, now = () => Date.now() }) {
    this.control = control;
    this.kind = kinds.get(control.kind);
    this.now = now;
    const initial = this.kind.initial(control);
    this.remainingMs = Object.fromEntries(seats.map((seat) => [seat, initial]));
    this.running = null;
    this.turnStartedAt = null;
  }

  get timed() {
    return this.kind.timed;
  }

  start(seat) {
    this.running = seat;
    this.turnStartedAt = this.now();
  }

  /** Ghế đang chạy vừa hành động xong: trừ giờ, cộng bonus, chuyển sang `next` (nếu có). */
  press(next) {
    const seat = this.running;
    if (!seat) return;
    const elapsed = this.now() - this.turnStartedAt;
    this.remainingMs[seat] = this.remainingMs[seat] - this.kind.charge(elapsed, this.control) + this.kind.bonus(this.control);
    if (next) this.start(next);
    else this.running = null;
  }

  stop() {
    if (!this.running) return;
    this.remainingMs[this.running] = this.remaining(this.running);
    this.running = null;
  }

  remaining(seat) {
    if (seat !== this.running) return this.remainingMs[seat];
    const elapsed = this.now() - this.turnStartedAt;
    return this.remainingMs[seat] - this.kind.charge(elapsed, this.control);
  }

  /** Số ms tới khi ghế đang chạy hết giờ (Infinity nếu không tính giờ). */
  msUntilFlag() {
    if (!this.timed || !this.running) return Infinity;
    let lo = 0;
    let hi = this.remainingMs[this.running] + 24 * 3600 * 1000;
    const elapsedNow = this.now() - this.turnStartedAt;
    // charge() đơn điệu -> tìm nhị phân, không giả định công thức cụ thể của kind.
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (this.remainingMs[this.running] - this.kind.charge(elapsedNow + mid, this.control) > 0) lo = mid;
      else hi = mid;
    }
    return hi;
  }

  flagged() {
    return this.timed && this.running !== null && this.remaining(this.running) <= 0 ? this.running : null;
  }

  snapshot() {
    if (!this.timed) return null;
    const remaining = {};
    for (const seat of Object.keys(this.remainingMs)) remaining[seat] = Math.max(0, Math.round(this.remaining(seat)));
    return { remaining, running: this.running };
  }
}
