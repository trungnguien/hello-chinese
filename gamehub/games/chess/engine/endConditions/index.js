import { Registry } from '../../../../shared/core/Registry.js';
import { opposite, fromAlgebraic, fileOf, rankOf } from '../geometry.js';

/**
 * Điều kiện kết thúc ván — mỗi điều kiện là một factory: options -> evaluate(ctx).
 * evaluate trả về { winner: 'w' | 'b' | null, reason } hoặc null nếu ván tiếp tục.
 *
 * ctx (contract ổn định do Game cung cấp):
 *   position, engine, legalMoves, history (các bản ghi nước đã đi),
 *   lastMove (bản ghi nước vừa đi), repetitions (số lần thế hiện tại đã xuất hiện)
 */
export const endConditionFactories = new Registry('end condition');

endConditionFactories.register('checkmate', () => (ctx) => {
  if (ctx.legalMoves.length || !ctx.engine.inCheck(ctx.position, ctx.position.turn)) return null;
  return { winner: opposite(ctx.position.turn), reason: 'checkmate' };
});

endConditionFactories.register('stalemate', () => (ctx) => {
  if (ctx.legalMoves.length || ctx.engine.inCheck(ctx.position, ctx.position.turn)) return null;
  return { winner: null, reason: 'stalemate' };
});

endConditionFactories.register('repetition', ({ count = 3 } = {}) => (ctx) =>
  ctx.repetitions >= count ? { winner: null, reason: 'repetition' } : null,
);

endConditionFactories.register('moveRule', ({ halfmoves = 100 } = {}) => (ctx) =>
  ctx.position.halfmove >= halfmoves ? { winner: null, reason: 'fifty_moves' } : null,
);

/** Không đủ quân chiếu hết: K-K, K+Mã/Tượng - K, K+Tượng - K+Tượng cùng màu ô. */
endConditionFactories.register('insufficientMaterial', () => (ctx) => {
  const others = [];
  for (const [sq, piece] of ctx.position.pieces()) {
    if (!ctx.engine.pieceDef(piece.type).royal) others.push({ sq, piece });
  }
  const minor = (x) => x.piece.type === 'b' || x.piece.type === 'n';
  const squareColor = (sq) => (fileOf(sq) + rankOf(sq)) % 2;
  const dead =
    others.length === 0 ||
    (others.length === 1 && minor(others[0])) ||
    (others.every((x) => x.piece.type === 'b') && new Set(others.map((x) => squareColor(x.sq))).size === 1);
  return dead ? { winner: null, reason: 'insufficient_material' } : null;
});

/** Quân "royal" của bên vừa đi chạm tới một trong các ô mục tiêu -> thắng (King of the Hill). */
endConditionFactories.register('reachSquares', ({ squares, reason = 'reached_target' }) => {
  const targets = new Set(squares.map(fromAlgebraic));
  return (ctx) => {
    if (!ctx.lastMove) return null;
    const mover = opposite(ctx.position.turn);
    for (const [sq, piece] of ctx.position.pieces(mover)) {
      if (ctx.engine.pieceDef(piece.type).royal && targets.has(sq)) return { winner: mover, reason };
    }
    return null;
  };
});

/** Chiếu đủ N lần thì thắng (Three-check). */
endConditionFactories.register('checkCount', ({ count = 3 } = {}) => (ctx) => {
  if (!ctx.lastMove) return null;
  const mover = ctx.lastMove.color;
  const checks = ctx.history.filter((h) => h.color === mover && h.check).length;
  return checks >= count ? { winner: mover, reason: 'check_count' } : null;
});
