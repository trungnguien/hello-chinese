/**
 * Văn bản giao diện của NỀN TẢNG là dữ liệu (nguyên tắc 3). Văn bản riêng của
 * từng game (lý do kết thúc...) đến từ manifest.texts của module.
 */
export const texts = {
  reasons: {
    resignation: 'Đầu hàng',
    timeout: 'Hết giờ',
    agreement: 'Hai bên đồng ý hoà',
  },
  errors: {
    illegal_move: 'Nước đi không hợp lệ',
    illegal_action: 'Hành động không hợp lệ',
    not_your_turn: 'Chưa tới lượt bạn',
    game_over: 'Ván đã kết thúc',
    not_found: 'Không tìm thấy phòng',
    conflict: 'Không thể thực hiện lúc này',
    forbidden: 'Bạn không có quyền làm việc này',
    unsupported: 'Game này không hỗ trợ chức năng đó',
    disconnected: 'Mất kết nối tới máy chủ',
  },
  notices: {
    draw_offered: 'Đối thủ đề nghị hoà',
  },
  status: {
    waiting: 'Đang chờ đối thủ…',
    yourTurn: 'Tới lượt bạn',
    theirTurn: 'Đối thủ đang nghĩ…',
    turnOf: (labels) => `Lượt ${labels}`,
  },
  reason(code, manifest) {
    return manifest?.texts?.reasons?.[code] ?? this.reasons[code] ?? code;
  },
  error(code, fallback) {
    return this.errors[code] ?? fallback ?? code;
  },
};
