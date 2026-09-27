/**
 * CONTRACT giao tiếp client <-> server (nguyên tắc 5).
 *
 * Đây là phần DUY NHẤT mà cả hai phía cùng phụ thuộc. Implementation hai bên có thể
 * đổi tuỳ ý (transport, lưu trữ, UI...) miễn là giữ đúng contract này.
 *
 * Quy tắc tiến hoá:
 *  - Chỉ THÊM loại message / trường tuỳ chọn; không đổi nghĩa trường đã có.
 *  - Bên nhận PHẢI bỏ qua trường lạ và message lạ (tolerant reader).
 *  - Thay đổi phá vỡ tương thích => tăng PROTOCOL_VERSION.
 *
 * Phong bì (envelope): { v, type, id?, replyTo?, payload }
 */
export const PROTOCOL_VERSION = 2;

/**
 * v2 (chợ game): "game.*" của v1 (chỉ cờ vua) được thay bằng "room.*" tổng quát.
 * Nước đi không còn là UCI mà là `action` — dữ liệu do module game định nghĩa.
 */

/** Client -> Server */
export const C2S = Object.freeze({
  HELLO: 'hello',
  LOBBY_LIST: 'lobby.list',
  ROOM_CREATE: 'room.create',
  ROOM_JOIN: 'room.join',
  ROOM_WATCH: 'room.watch',
  ROOM_LEAVE: 'room.leave',
  ROOM_ACTION: 'room.action',
  ROOM_RESIGN: 'room.resign',
  ROOM_OFFER_DRAW: 'room.offerDraw',
  ROOM_RESPOND_DRAW: 'room.respondDraw',
  CHAT_SEND: 'chat.send',
});

/** Server -> Client */
export const S2C = Object.freeze({
  WELCOME: 'welcome',
  LOBBY_STATE: 'lobby.state',
  ROOM_STATE: 'room.state',
  CHAT_MESSAGE: 'chat.message',
  NOTICE: 'notice',
  ERROR: 'error',
  ACK: 'ack',
});

/**
 * Schema tối giản mô tả bằng DỮ LIỆU (nguyên tắc 3). Kiểu: 'string' | 'boolean' | 'number' | 'object',
 * hậu tố '?' là tuỳ chọn. Trường không khai báo sẽ được bỏ qua (không lỗi).
 */
export const schemas = Object.freeze({
  [C2S.HELLO]: { name: 'string?', token: 'string?' },
  [C2S.LOBBY_LIST]: {},
  [C2S.ROOM_CREATE]: { game: 'string', options: 'object?', timeControl: 'string?', seat: 'string?', opponent: 'string?' },
  [C2S.ROOM_JOIN]: { roomId: 'string' },
  [C2S.ROOM_WATCH]: { roomId: 'string' },
  [C2S.ROOM_LEAVE]: { roomId: 'string' },
  [C2S.ROOM_ACTION]: { roomId: 'string', action: 'object' },
  [C2S.ROOM_RESIGN]: { roomId: 'string' },
  [C2S.ROOM_OFFER_DRAW]: { roomId: 'string' },
  [C2S.ROOM_RESPOND_DRAW]: { roomId: 'string', accept: 'boolean' },
  [C2S.CHAT_SEND]: { roomId: 'string', text: 'string' },
});

/** Mã lỗi ổn định — UI dịch sang ngôn ngữ hiển thị. */
export const ERRORS = Object.freeze({
  BAD_MESSAGE: 'bad_message',
  UNSUPPORTED_VERSION: 'unsupported_version',
  UNKNOWN_TYPE: 'unknown_type',
  INVALID_PAYLOAD: 'invalid_payload',
  NOT_IDENTIFIED: 'not_identified',
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  CONFLICT: 'conflict',
  ILLEGAL_MOVE: 'illegal_move',
  ILLEGAL_ACTION: 'illegal_action',
  UNSUPPORTED: 'unsupported',
  GAME_OVER: 'game_over',
  NOT_YOUR_TURN: 'not_your_turn',
  INTERNAL: 'internal',
});

export function encode(type, payload = {}, meta = {}) {
  return { v: PROTOCOL_VERSION, type, ...meta, payload };
}

/** @returns {{ ok: true, message } | { ok: false, code, detail }} */
export function decode(raw) {
  let message;
  try {
    message = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { ok: false, code: ERRORS.BAD_MESSAGE, detail: 'invalid JSON' };
  }
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    return { ok: false, code: ERRORS.BAD_MESSAGE, detail: 'missing type' };
  }
  if (message.v !== undefined && message.v > PROTOCOL_VERSION) {
    return { ok: false, code: ERRORS.UNSUPPORTED_VERSION, detail: `server speaks v${PROTOCOL_VERSION}` };
  }
  return { ok: true, message: { ...message, payload: message.payload ?? {} } };
}

/** @returns {string[]} danh sách lỗi (rỗng = hợp lệ) */
export function validate(type, payload) {
  const schema = schemas[type];
  if (!schema) return [];
  const errors = [];
  for (const [field, spec] of Object.entries(schema)) {
    const optional = spec.endsWith('?');
    const kind = optional ? spec.slice(0, -1) : spec;
    const value = payload?.[field];
    if (value === undefined || value === null) {
      if (!optional) errors.push(`${field} is required`);
    } else if (kind === 'object' ? typeof value !== 'object' || Array.isArray(value) : typeof value !== kind) {
      errors.push(`${field} must be ${kind}`);
    }
  }
  return errors;
}

/**
 * Hình dạng ROOM_STATE (tài liệu hoá contract):
 * {
 *   id, status: 'waiting'|'active'|'ended',
 *   game: { id, name, icon }, options, summary, timeControl: { id, label } | null,
 *   seats: [{ id, label, player: { id, name, isBot } | null }],
 *   you: seatId | null, active: seatId[],
 *   clock: { remaining: { [seat]: ms }, running, serverNow } | null,
 *   drawOffer: seatId | null, result: { winners: seatId[], reason } | null,
 *   log: [{ seat, text }], view: <do module game định nghĩa>, spectators: number,
 *   capabilities: { clock, drawOffers, flip }
 * }
 */
