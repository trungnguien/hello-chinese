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
export const PROTOCOL_VERSION = 1;

/** Client -> Server */
export const C2S = Object.freeze({
  HELLO: 'hello',
  LOBBY_LIST: 'lobby.list',
  GAME_CREATE: 'game.create',
  GAME_JOIN: 'game.join',
  GAME_WATCH: 'game.watch',
  GAME_LEAVE: 'game.leave',
  GAME_MOVE: 'game.move',
  GAME_RESIGN: 'game.resign',
  GAME_OFFER_DRAW: 'game.offerDraw',
  GAME_RESPOND_DRAW: 'game.respondDraw',
  CHAT_SEND: 'chat.send',
});

/** Server -> Client */
export const S2C = Object.freeze({
  WELCOME: 'welcome',
  LOBBY_STATE: 'lobby.state',
  GAME_STATE: 'game.state',
  CHAT_MESSAGE: 'chat.message',
  NOTICE: 'notice',
  ERROR: 'error',
  ACK: 'ack',
});

/**
 * Schema tối giản mô tả bằng DỮ LIỆU (nguyên tắc 3). Kiểu: 'string' | 'boolean' | 'number',
 * hậu tố '?' là tuỳ chọn. Trường không khai báo sẽ được bỏ qua (không lỗi).
 */
export const schemas = Object.freeze({
  [C2S.HELLO]: { name: 'string?', token: 'string?' },
  [C2S.LOBBY_LIST]: {},
  [C2S.GAME_CREATE]: { variant: 'string', timeControl: 'string', color: 'string?', opponent: 'string?' },
  [C2S.GAME_JOIN]: { gameId: 'string' },
  [C2S.GAME_WATCH]: { gameId: 'string' },
  [C2S.GAME_LEAVE]: { gameId: 'string' },
  [C2S.GAME_MOVE]: { gameId: 'string', uci: 'string' },
  [C2S.GAME_RESIGN]: { gameId: 'string' },
  [C2S.GAME_OFFER_DRAW]: { gameId: 'string' },
  [C2S.GAME_RESPOND_DRAW]: { gameId: 'string', accept: 'boolean' },
  [C2S.CHAT_SEND]: { gameId: 'string', text: 'string' },
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
    } else if (typeof value !== kind) {
      errors.push(`${field} must be ${kind}`);
    }
  }
  return errors;
}

/**
 * Hình dạng GAME_STATE (tài liệu hoá contract, không phải code thực thi):
 * {
 *   id, status: 'waiting'|'active'|'ended',
 *   variant: { id, name, description }, timeControl: { id, label },
 *   players: { w: Player|null, b: Player|null },  Player = { id, name, isBot }
 *   you: 'w'|'b'|null, fen, turn, check, lastMove: { from, to }|null,
 *   moves: [{ san, uci, color }], legalMoves: string[] (UCI, chỉ khi tới lượt bạn),
 *   clock: { w, b, running, serverNow } | null, drawOffer: 'w'|'b'|null,
 *   result: { winner, reason, score } | null, spectators: number
 * }
 */
