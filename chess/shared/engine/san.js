import { toAlgebraic, fileOf, rankOf, FILES } from './geometry.js';

/** Ký hiệu đại số chuẩn (SAN). Chữ cái quân lấy từ dữ liệu `sanLetter`. */
export function toSan(engine, pos, move, legalMoves) {
  let san;
  if (move.flags.castle) {
    san = fileOf(move.to) > fileOf(move.from) ? 'O-O' : 'O-O-O';
  } else {
    const letter = engine.pieceDef(move.piece.type).sanLetter ?? move.piece.type.toUpperCase();
    san = letter;
    if (letter) {
      const rivals = legalMoves.filter(
        (m) => m.piece.type === move.piece.type && m.to === move.to && m.from !== move.from && !m.flags.castle,
      );
      if (rivals.length) {
        const sameFile = rivals.some((m) => fileOf(m.from) === fileOf(move.from));
        const sameRank = rivals.some((m) => rankOf(m.from) === rankOf(move.from));
        if (!sameFile) san += FILES[fileOf(move.from)];
        else if (!sameRank) san += rankOf(move.from) + 1;
        else san += toAlgebraic(move.from);
      }
    } else if (move.captured) {
      san += FILES[fileOf(move.from)];
    }
    if (move.captured) san += 'x';
    san += toAlgebraic(move.to);
    if (move.promotion) san += '=' + move.promotion.toUpperCase();
  }
  const next = engine.apply(pos, move);
  if (engine.inCheck(next, next.turn)) san += engine.legalMoves(next).length ? '+' : '#';
  return san;
}
