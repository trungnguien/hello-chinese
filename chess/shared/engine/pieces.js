/**
 * Bộ quân cờ tiêu chuẩn — hoàn toàn là DỮ LIỆU (nguyên tắc 3).
 * Engine không hề có `if (type === 'n')`: mọi hành vi đến từ mô tả dưới đây.
 */
const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

export const STANDARD_PIECES = Object.freeze({
  p: {
    name: 'Tốt',
    value: 1,
    sanLetter: '',
    resetsMoveClock: true,
    movement: [{ kind: 'pawn', push: [0, 1], captures: [[-1, 1], [1, 1]], doubleStepFromRank: 1 }],
    promotion: { onRelativeRank: 7, choices: ['q', 'r', 'b', 'n'] },
  },
  n: { name: 'Mã', value: 3, sanLetter: 'N', movement: [{ kind: 'leap', vectors: KNIGHT }] },
  b: { name: 'Tượng', value: 3, sanLetter: 'B', movement: [{ kind: 'slide', vectors: DIAGONAL }] },
  r: { name: 'Xe', value: 5, sanLetter: 'R', movement: [{ kind: 'slide', vectors: ORTHOGONAL }] },
  q: { name: 'Hậu', value: 9, sanLetter: 'Q', movement: [{ kind: 'slide', vectors: [...ORTHOGONAL, ...DIAGONAL] }] },
  k: {
    name: 'Vua',
    value: 0,
    sanLetter: 'K',
    royal: true,
    movement: [{ kind: 'leap', vectors: [...ORTHOGONAL, ...DIAGONAL] }],
  },
});
