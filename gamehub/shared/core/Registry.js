/**
 * Registry — điểm mở rộng (extension point) tổng quát.
 *
 * Nguyên tắc 1 & 2: mã sử dụng chỉ biết một "id" (capability) và tra cứu
 * implementation lúc chạy (late binding), không import trực tiếp lớp cụ thể.
 * Nguyên tắc 6 & 7: thêm chức năng mới = register thêm một mục, không sửa mã cũ.
 */
export class Registry {
  #items = new Map();

  /** @param {string} kind tên loại đối tượng, dùng cho thông báo lỗi */
  constructor(kind) {
    this.kind = kind;
  }

  register(id, item) {
    if (typeof id !== 'string' || !id) throw new TypeError(`${this.kind}: id must be a non-empty string`);
    if (this.#items.has(id)) throw new Error(`${this.kind} "${id}" is already registered`);
    this.#items.set(id, item);
    return this;
  }

  /** Ghi đè có chủ đích (ví dụ plugin thay thế implementation mặc định). */
  replace(id, item) {
    this.#items.set(id, item);
    return this;
  }

  has(id) {
    return this.#items.has(id);
  }

  get(id) {
    if (!this.#items.has(id)) {
      const known = [...this.#items.keys()].join(', ') || '(none)';
      throw new Error(`Unknown ${this.kind} "${id}". Registered: ${known}`);
    }
    return this.#items.get(id);
  }

  find(id) {
    return this.#items.get(id);
  }

  ids() {
    return [...this.#items.keys()];
  }

  entries() {
    return [...this.#items.entries()];
  }
}
