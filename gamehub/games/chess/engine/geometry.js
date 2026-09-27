/** Toạ độ bàn cờ 8x8: ô = rank * 8 + file, rank 0 là hàng 1 (phía Trắng). */
export const FILES = 'abcdefgh';
export const SIZE = 8;

export const square = (file, rank) => rank * SIZE + file;
export const fileOf = (sq) => sq % SIZE;
export const rankOf = (sq) => Math.floor(sq / SIZE);
export const onBoard = (file, rank) => file >= 0 && file < SIZE && rank >= 0 && rank < SIZE;

export const WHITE = 'w';
export const BLACK = 'b';
export const opposite = (color) => (color === WHITE ? BLACK : WHITE);
/** Hướng "tiến lên" theo rank của mỗi bên. */
export const forward = (color) => (color === WHITE ? 1 : -1);
/** Rank tương đối: 0 = hàng cuối của bên mình. */
export const relativeRank = (sq, color) => (color === WHITE ? rankOf(sq) : SIZE - 1 - rankOf(sq));

export function toAlgebraic(sq) {
  return FILES[fileOf(sq)] + (rankOf(sq) + 1);
}

export function fromAlgebraic(name) {
  if (typeof name !== 'string' || !/^[a-h][1-8]$/.test(name)) {
    throw new Error(`Invalid square "${name}"`);
  }
  return square(FILES.indexOf(name[0]), Number(name[1]) - 1);
}

/** Dịch ô theo vector (df, dr); trả về null nếu ra ngoài bàn. */
export function offset(sq, df, dr) {
  const f = fileOf(sq) + df;
  const r = rankOf(sq) + dr;
  return onBoard(f, r) ? square(f, r) : null;
}
