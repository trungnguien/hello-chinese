import { opposite } from './geometry.js';

/**
 * Engine sinh nước đi và áp dụng nước đi cho MỘT variant đã được lắp ráp.
 * Engine chỉ phụ thuộc vào các capability: pieceDef, movement kind, rule hooks
 * (nguyên tắc 1) — không có luật cụ thể nào được viết cứng ở đây.
 */
export class Engine {
  /** @param {import('./Variant.js').Variant} variant */
  constructor(variant) {
    this.variant = variant;
  }

  pieceDef(type) {
    const def = this.variant.pieces[type];
    if (!def) throw new Error(`Variant "${this.variant.id}" has no piece "${type}"`);
    return def;
  }

  movement(kind) {
    return this.variant.movementKinds.get(kind);
  }

  pseudoMoves(pos, color = pos.turn) {
    let moves = [];
    for (const [from, piece] of pos.pieces(color)) {
      for (const spec of this.pieceDef(piece.type).movement) {
        moves.push(...this.movement(spec.kind).moves(pos, from, piece, spec));
      }
    }
    for (const rule of this.variant.rules) {
      if (rule.generate) moves.push(...rule.generate(pos, color, this));
    }
    for (const rule of this.variant.rules) {
      if (rule.expand) moves = moves.flatMap((m) => rule.expand(m, pos, this) ?? [m]);
    }
    return moves;
  }

  legalMoves(pos) {
    return this.pseudoMoves(pos).filter((move) => !this.inCheck(this.apply(pos, move), pos.turn));
  }

  isAttacked(pos, sq, byColor) {
    for (const [from, piece] of pos.pieces(byColor)) {
      for (const spec of this.pieceDef(piece.type).movement) {
        if (this.movement(spec.kind).attacks(pos, from, piece, spec).includes(sq)) return true;
      }
    }
    return false;
  }

  royalSquares(pos, color) {
    const out = [];
    for (const [sq, piece] of pos.pieces(color)) if (this.pieceDef(piece.type).royal) out.push(sq);
    return out;
  }

  inCheck(pos, color) {
    return this.royalSquares(pos, color).some((sq) => this.isAttacked(pos, sq, opposite(color)));
  }

  apply(pos, move) {
    const next = pos.clone();
    next.set(move.from, null);
    if (move.capturedSquare !== null) next.set(move.capturedSquare, null);
    next.set(move.to, move.piece);
    next.ep = null;
    next.halfmove = move.captured || this.pieceDef(move.piece.type).resetsMoveClock ? 0 : pos.halfmove + 1;
    if (pos.turn === 'b') next.fullmove = pos.fullmove + 1;
    next.turn = opposite(pos.turn);
    for (const rule of this.variant.rules) rule.apply?.(pos, next, move, this);
    return next;
  }
}
