import { encode, decode, S2C } from '/shared/protocol/contract.js';

/**
 * Nói chuyện với server theo contract. Không biết gì về transport cụ thể
 * lẫn UI: nhận transport qua constructor, phát message nhận được lên bus
 * dưới tên 'server:<type>' (nguyên tắc 1 & 4).
 */
export class ServerConnection {
  #pending = new Map();
  #nextId = 1;

  constructor({ transport, bus }) {
    this.transport = transport;
    this.bus = bus;
    transport.events.on('open', () => bus.emit('connection.open'));
    transport.events.on('close', () => {
      for (const { reject } of this.#pending.values()) reject(Object.assign(new Error('disconnected'), { code: 'disconnected' }));
      this.#pending.clear();
      bus.emit('connection.closed');
    });
    transport.events.on('message', (raw) => this.#receive(raw));
  }

  connect() {
    this.transport.connect();
  }

  /** Gửi không chờ phản hồi. */
  send(type, payload) {
    this.transport.send(encode(type, payload));
  }

  /** Gửi và chờ ACK / ERROR tương ứng. */
  request(type, payload) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.transport.send(encode(type, payload, { id }));
    });
  }

  #receive(raw) {
    const decoded = decode(raw);
    if (!decoded.ok) return;
    const { type, payload, replyTo } = decoded.message;
    if (replyTo !== undefined && this.#pending.has(replyTo)) {
      const { resolve, reject } = this.#pending.get(replyTo);
      this.#pending.delete(replyTo);
      if (type === S2C.ERROR) reject(Object.assign(new Error(payload.message), { code: payload.code }));
      else resolve(payload);
      return;
    }
    this.bus.emit(`server:${type}`, payload);
  }
}
