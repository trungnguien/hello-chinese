import { SIZE } from './geometry.js';

/**
 * Trạng thái một thế cờ. Không chứa luật — luật nằm ở Engine/Variant.
 * Quân cờ là object bất biến { color, type }.
 */
export class Position {
  constructor({ board, turn = 'w', castling = [], ep = null, halfmove = 0, fullmove = 1, extra = {} }) {
    this.board = board ?? new Array(SIZE * SIZE).fill(null);
    this.turn = turn;
    this.castling = new Set(castling);
    this.ep = ep;
    this.halfmove = halfmove;
    this.fullmove = fullmove;
    /** Chỗ để các rule/variant mở rộng lưu trạng thái riêng (nguyên tắc 7). */
    this.extra = extra;
  }

  clone() {
    return new Position({
      board: this.board.slice(),
      turn: this.turn,
      castling: [...this.castling],
      ep: this.ep,
      halfmove: this.halfmove,
      fullmove: this.fullmove,
      extra: structuredClone(this.extra),
    });
  }

  get(sq) {
    return this.board[sq];
  }

  set(sq, piece) {
    this.board[sq] = piece;
  }

  *pieces(color) {
    for (let sq = 0; sq < this.board.length; sq++) {
      const piece = this.board[sq];
      if (piece && (!color || piece.color === color)) yield [sq, piece];
    }
  }
}
