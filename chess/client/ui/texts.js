/**
 * Văn bản giao diện là DỮ LIỆU (nguyên tắc 3): đổi ngôn ngữ = thay bảng này.
 * Mã lạ không có trong bảng vẫn hiển thị được (tolerant reader).
 */
export const texts = {
  reasons: {
    checkmate: 'Chiếu hết',
    stalemate: 'Hết nước đi (pat)',
    repetition: 'Lặp lại thế cờ 3 lần',
    fifty_moves: 'Luật 50 nước',
    insufficient_material: 'Không đủ quân để chiếu hết',
    king_of_the_hill: 'Vua đã lên đồi',
    check_count: 'Chiếu đủ 3 lần',
    resignation: 'Đầu hàng',
    timeout: 'Hết giờ',
    timeout_insufficient: 'Hết giờ, nhưng đối phương không đủ quân',
    agreement: 'Hai bên đồng ý hoà',
  },
  errors: {
    illegal_move: 'Nước đi không hợp lệ',
    not_your_turn: 'Chưa tới lượt bạn',
    game_over: 'Ván cờ đã kết thúc',
    not_found: 'Không tìm thấy ván cờ',
    conflict: 'Không thể thực hiện lúc này',
    forbidden: 'Bạn không có quyền làm việc này',
    disconnected: 'Mất kết nối tới máy chủ',
  },
  notices: {
    draw_offered: 'Đối thủ đề nghị hoà',
  },
  colors: { w: 'Trắng', b: 'Đen' },
  status: {
    waiting: 'Đang chờ đối thủ…',
    yourTurn: 'Tới lượt bạn',
    theirTurn: 'Đối thủ đang nghĩ…',
    turnOf: (color) => `Lượt ${texts.colors[color]}`,
  },
  reason(code) {
    return this.reasons[code] ?? code;
  },
  error(code, fallback) {
    return this.errors[code] ?? fallback ?? code;
  },
};
