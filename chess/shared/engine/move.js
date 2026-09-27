import { toAlgebraic, fromAlgebraic } from './geometry.js';

/**
 * Nước đi là dữ liệu thuần. `flags` là túi mở rộng cho rule (castle, enPassant, doubleStep...).
 */
export function createMove({ from, to, piece, captured = null, capturedSquare = null, promotion = null, flags = {} }) {
  return { from, to, piece, captured, capturedSquare: captured ? (capturedSquare ?? to) : null, promotion, flags };
}

/** UCI là contract ổn định cho nước đi trên dây: "e2e4", "e7e8q". */
export function toUci(move) {
  return toAlgebraic(move.from) + toAlgebraic(move.to) + (move.promotion ?? '');
}

export function parseUci(uci) {
  const m = /^([a-h][1-8])([a-h][1-8])([a-z])?$/.exec(uci ?? '');
  if (!m) throw new Error(`Invalid move "${uci}"`);
  return { from: fromAlgebraic(m[1]), to: fromAlgebraic(m[2]), promotion: m[3] ?? null };
}
