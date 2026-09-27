/**
 * CONTRACT CỦA MỘT MODULE GAME (nguyên tắc 5).
 *
 * Nền tảng (phòng chơi, sảnh, đồng hồ, chat, bot, lưu trữ) KHÔNG biết luật của
 * game nào. Nó chỉ nói chuyện với module qua contract dưới đây. Thêm game mới =
 * viết một module thoả contract này và khai báo trong cấu hình (nguyên tắc 6).
 *
 * ── Phía server ─────────────────────────────────────────────────────────────
 * export default {
 *   manifest,                               // DỮ LIỆU mô tả game (xem dưới)
 *   createMatch({ options, seats, rng }) -> Match,
 *   bots?:      { [strategyId]: (match, seat) -> action },
 *   exporters?: { [format]: (record) -> { extension, content } },
 * }
 *
 * Match:
 *   activeSeats()            -> string[]    ghế đang phải hành động ([] khi hết ván)
 *   act(seat, action)        -> { text?, notes? }
 *        text : ký hiệu ngắn cho nhật ký ("Nf3", "H8")
 *        notes: [{ kind: 'capture' | 'check' | 'threat' | ..., label? }] — gợi ý cho bot/hiệu ứng
 *        Hành động sai luật: ném Error có `code` (vd. 'illegal_action').
 *   outcome()                -> null | { winners: string[], reason }   winners rỗng = hoà
 *   view(seat | null)        -> JSON         phần người xem được phép thấy
 *   legalActions?(seat)      -> action[]    (dùng cho bot chung)
 *   timeoutOutcome?(seat)    -> outcome     (vd. cờ vua: hết giờ nhưng đối thủ không đủ quân -> hoà)
 *   chatFacts?(seat)         -> { assessment?, hint? }  cho kỹ năng tán gẫu của bot
 *
 * ── Manifest (dữ liệu) ─────────────────────────────────────────────────────
 * {
 *   id, apiVersion: 1, version, name, icon, tagline, description, tags: [],
 *   seats: [{ id, label }],
 *   capabilities: { clock?, drawOffers?, flip? },
 *   options: [{ id, label, type: 'select', default, choices: [{ value, label, description? }] }],
 *   client: { dir: 'client', entry: 'index.js', styles?: 'x.css' },
 *   texts?: { reasons: { [code]: string } },
 * }
 *
 * ── Phía client (games/<id>/client/<entry>) ───────────────────────────────
 * export function mount(element, api) -> { update(view, ctx), unmount() }
 *   api.sendAction(action)
 *   ctx = { you, active: boolean, status, flipped }
 */
export const GAME_API_VERSION = 1;

/** Lỗi luật chơi có mã ổn định để nền tảng chuyển tiếp cho client. */
export function ruleError(code, message) {
  return Object.assign(new Error(message ?? code), { code });
}

const MATCH_METHODS = ['activeSeats', 'act', 'outcome', 'view'];

/** Kiểm tra module khi nạp — phát hiện sai contract sớm, lúc khởi động. */
export function assertGameModule(module, source = 'module') {
  const fail = (msg) => {
    throw new Error(`Invalid game module ${source}: ${msg}`);
  };
  const m = module?.manifest;
  if (!m) fail('missing manifest');
  if (m.apiVersion !== GAME_API_VERSION) fail(`apiVersion ${m.apiVersion} not supported (need ${GAME_API_VERSION})`);
  if (!/^[a-z][a-z0-9-]*$/.test(m.id ?? '')) fail('manifest.id must be kebab-case');
  if (!Array.isArray(m.seats) || m.seats.length < 1) fail('manifest.seats must be a non-empty array');
  if (typeof module.createMatch !== 'function') fail('createMatch() missing');
  for (const opt of m.options ?? []) {
    if (!opt.choices?.some((c) => c.value === opt.default)) fail(`option "${opt.id}" default not in choices`);
  }
  return module;
}

export function assertMatch(match, id) {
  for (const method of MATCH_METHODS) {
    if (typeof match?.[method] !== 'function') throw new Error(`Game "${id}": match.${method}() missing`);
  }
  return match;
}

/** Chuẩn hoá lựa chọn người dùng theo schema trong manifest (giá trị lạ -> mặc định). */
export function resolveOptions(manifest, input = {}) {
  const out = {};
  for (const opt of manifest.options ?? []) {
    const value = input[opt.id];
    out[opt.id] = opt.choices.some((c) => c.value === value) ? value : opt.default;
  }
  return out;
}

/** Tóm tắt lựa chọn để hiển thị ("Vua trên đồi"). */
export function describeOptions(manifest, options) {
  return (manifest.options ?? [])
    .map((opt) => opt.choices.find((c) => c.value === options[opt.id])?.label)
    .filter(Boolean)
    .join(' · ');
}

/** Phần manifest công khai gửi cho client (không gồm hàm). */
export function publicManifest(manifest) {
  return JSON.parse(JSON.stringify(manifest));
}
