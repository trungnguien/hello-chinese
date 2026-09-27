import { decode, validate, encode, S2C, ERRORS } from '../../shared/protocol/contract.js';

/**
 * Giải mã message theo contract, kiểm tra schema rồi chuyển cho handler
 * tìm thấy trong registry theo `type`. Thêm loại message mới = register handler mới
 * (nguyên tắc 6) — router không đổi.
 *
 * Handler contract: { type, requiresIdentity?: boolean, handle(ctx) -> Promise<object|void> }
 */
export class MessageRouter {
  constructor({ handlers, context, logger = console }) {
    this.handlers = handlers;
    this.context = context;
    this.logger = logger;
  }

  async handle(connection, raw) {
    const decoded = decode(raw);
    if (!decoded.ok) return connection.send(encode(S2C.ERROR, { code: decoded.code, message: decoded.detail }));
    const { type, payload, id } = decoded.message;
    const meta = id !== undefined ? { replyTo: id } : {};
    const fail = (code, message) => connection.send(encode(S2C.ERROR, { code, message, type }, meta));

    const handler = this.handlers.find(type);
    if (!handler) return fail(ERRORS.UNKNOWN_TYPE, `Unknown message type "${type}"`);
    const errors = validate(type, payload);
    if (errors.length) return fail(ERRORS.INVALID_PAYLOAD, errors.join('; '));
    if (handler.requiresIdentity !== false && !connection.player) return fail(ERRORS.NOT_IDENTIFIED, 'Send hello first');

    try {
      const result = await handler.handle({
        ...this.context,
        connection,
        player: connection.player,
        payload,
        send: (t, p) => connection.send(encode(t, p)),
      });
      if (id !== undefined) connection.send(encode(S2C.ACK, result ?? {}, meta));
    } catch (err) {
      if (!err.code) this.logger.error(`[router] ${type} failed:`, err);
      fail(err.code ?? ERRORS.INTERNAL, err.code ? err.message : 'Internal error');
    }
  }
}
