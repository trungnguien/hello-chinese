/**
 * EventBus — kênh publish/subscribe tối giản, chạy được cả trên Node và trình duyệt.
 *
 * Nguyên tắc 4: thành phần phát sự kiện KHÔNG biết ai sẽ phản ứng.
 * Người nghe mới (log, lưu trữ, bot, thống kê...) được gắn thêm mà không sửa người phát.
 *
 * - `on('*', fn)` nhận mọi sự kiện (fn(type, payload)).
 * - Lỗi trong một handler được cô lập, không làm hỏng các handler khác.
 */
export class EventBus {
  #handlers = new Map();
  #onError;

  constructor({ onError } = {}) {
    this.#onError = onError ?? ((err, type) => console.error(`[EventBus] handler for "${type}" failed:`, err));
  }

  on(type, handler) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }

  once(type, handler) {
    const off = this.on(type, (...args) => {
      off();
      handler(...args);
    });
    return off;
  }

  off(type, handler) {
    this.#handlers.get(type)?.delete(handler);
  }

  emit(type, payload) {
    for (const handler of [...(this.#handlers.get(type) ?? [])]) {
      this.#safely(type, () => handler(payload));
    }
    for (const handler of [...(this.#handlers.get('*') ?? [])]) {
      this.#safely(type, () => handler(type, payload));
    }
  }

  #safely(type, fn) {
    try {
      const result = fn();
      if (result && typeof result.catch === 'function') result.catch((err) => this.#onError(err, type));
    } catch (err) {
      this.#onError(err, type);
    }
  }
}
