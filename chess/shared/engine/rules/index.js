import { Registry } from '../../core/Registry.js';
import { fromAlgebraic, offset, opposite, relativeRank, rankOf } from '../geometry.js';
import { createMove } from '../move.js';
import { makePiece } from '../fen.js';

/**
 * Rule = luật đặc biệt, được ghép vào Variant (nguyên tắc 6).
 * Registry chứa FACTORY: options (dữ liệu) -> rule object. Hook tuỳ chọn:
 *
 *   generate(pos, color, engine) -> Move[]        thêm nước đi đặc biệt
 *   expand(move, pos, engine)    -> Move[] | null  biến một nước thành nhiều (phong cấp)
 *   apply(prev, next, move, engine)                cập nhật thế cờ sau nước đi
 *
 * Engine chỉ biết contract này — không biết có bao nhiêu rule hay rule nào.
 */
export const ruleFactories = new Registry('rule');

/** Nhập thành — cấu hình hoàn toàn bằng dữ liệu (dùng được cho Chess960 sau này). */
ruleFactories.register('castling', (options) => {
  const entries = options.entries.map((e) => ({
    ...e,
    kingFrom: fromAlgebraic(e.kingFrom),
    kingTo: fromAlgebraic(e.kingTo),
    rookFrom: fromAlgebraic(e.rookFrom),
    rookTo: fromAlgebraic(e.rookTo),
    mustBeEmpty: e.mustBeEmpty.map(fromAlgebraic),
    mustBeSafe: e.mustBeSafe.map(fromAlgebraic),
  }));
  return {
    id: 'castling',
    generate(pos, color, engine) {
      const out = [];
      for (const e of entries) {
        if (e.color !== color || !pos.castling.has(e.right)) continue;
        const king = pos.get(e.kingFrom);
        const rook = pos.get(e.rookFrom);
        if (!king || king.color !== color || !engine.pieceDef(king.type).royal) continue;
        if (!rook || rook.color !== color || rook.type !== e.rookType) continue;
        if (e.mustBeEmpty.some((sq) => pos.get(sq))) continue;
        if (e.mustBeSafe.some((sq) => engine.isAttacked(pos, sq, opposite(color)))) continue;
        out.push(createMove({ from: e.kingFrom, to: e.kingTo, piece: king, flags: { castle: e.right } }));
      }
      return out;
    },
    apply(prev, next, move) {
      if (move.flags.castle) {
        const e = entries.find((x) => x.right === move.flags.castle);
        const rook = next.get(e.rookFrom);
        next.set(e.rookFrom, null);
        next.set(e.rookTo, rook);
      }
      for (const e of entries) {
        if (!next.castling.has(e.right)) continue;
        const touched = [move.from, move.to];
        if (touched.includes(e.rookFrom) || (move.from === e.kingFrom && move.piece.color === e.color)) {
          next.castling.delete(e.right);
        }
      }
    },
  };
});

/** Bắt tốt qua đường: đọc cờ `doubleStep` do movement 'pawn' gắn vào nước đi. */
ruleFactories.register('enPassant', () => ({
  id: 'enPassant',
  generate(pos, color, engine) {
    if (pos.ep === null) return [];
    const out = [];
    for (const [from, piece] of pos.pieces(color)) {
      const def = engine.pieceDef(piece.type);
      const pawnSpec = def.movement.find((m) => m.kind === 'pawn');
      if (!pawnSpec) continue;
      const attacks = engine.movement('pawn').attacks(pos, from, piece, pawnSpec);
      if (!attacks.includes(pos.ep)) continue;
      // Quân bị bắt nằm cùng file với ô ep, cùng rank với quân đi.
      const capturedSquare = offset(pos.ep, 0, rankOf(from) - rankOf(pos.ep));
      const captured = pos.get(capturedSquare);
      if (!captured || captured.color === color) continue;
      out.push(createMove({ from, to: pos.ep, piece, captured, capturedSquare, flags: { enPassant: true } }));
    }
    return out;
  },
  apply(prev, next, move) {
    if (move.flags.doubleStep) next.ep = move.flags.epTarget;
  },
}));

/** Phong cấp: quân nào có `promotion` trong dữ liệu sẽ được phong khi tới rank chỉ định. */
ruleFactories.register('promotion', () => ({
  id: 'promotion',
  expand(move, pos, engine) {
    const rule = engine.pieceDef(move.piece.type).promotion;
    if (!rule || move.promotion) return null;
    if (relativeRank(move.to, move.piece.color) !== rule.onRelativeRank) return null;
    return rule.choices.map((type) => ({ ...move, promotion: type }));
  },
  apply(prev, next, move) {
    if (move.promotion) next.set(move.to, makePiece(move.piece.color, move.promotion));
  },
}));

