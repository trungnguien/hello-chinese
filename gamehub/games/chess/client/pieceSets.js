/**
 * Bộ hiển thị quân cờ — dữ liệu thuần. Thêm bộ mới (SVG, chữ cái...) = thêm một mục.
 * Loại quân không có trong bộ sẽ hiển thị bằng chữ cái (điểm mở rộng cho variant mới).
 * U+FE0E ép trình duyệt vẽ dạng ký tự thay vì emoji.
 */
const TEXT_PRESENTATION = '︎';

export const pieceSets = {
  unicode: {
    glyphs: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
    render(piece) {
      const glyph = this.glyphs[piece.type];
      return glyph ? glyph + TEXT_PRESENTATION : null;
    },
  },
  letters: {
    render: (piece) => piece.type.toUpperCase(),
  },
};

export function renderPiece(set, piece) {
  try {
    return set.render(piece) ?? piece.type.toUpperCase();
  } catch {
    return piece.type.toUpperCase();
  }
}
