import { Registry } from '../../core/Registry.js';
import { STANDARD_PIECES } from '../pieces.js';

/**
 * Các biến thể cờ — thuần DỮ LIỆU. Biến thể mới được tạo bằng cách ghép/ghi đè
 * một phần định nghĩa có sẵn, không đụng vào Engine.
 */
export const variantDefinitions = new Registry('variant');

const STANDARD_CASTLING = {
  id: 'castling',
  options: {
    entries: [
      { right: 'K', color: 'w', rookType: 'r', kingFrom: 'e1', kingTo: 'g1', rookFrom: 'h1', rookTo: 'f1', mustBeEmpty: ['f1', 'g1'], mustBeSafe: ['e1', 'f1', 'g1'] },
      { right: 'Q', color: 'w', rookType: 'r', kingFrom: 'e1', kingTo: 'c1', rookFrom: 'a1', rookTo: 'd1', mustBeEmpty: ['b1', 'c1', 'd1'], mustBeSafe: ['e1', 'd1', 'c1'] },
      { right: 'k', color: 'b', rookType: 'r', kingFrom: 'e8', kingTo: 'g8', rookFrom: 'h8', rookTo: 'f8', mustBeEmpty: ['f8', 'g8'], mustBeSafe: ['e8', 'f8', 'g8'] },
      { right: 'q', color: 'b', rookType: 'r', kingFrom: 'e8', kingTo: 'c8', rookFrom: 'a8', rookTo: 'd8', mustBeEmpty: ['b8', 'c8', 'd8'], mustBeSafe: ['e8', 'd8', 'c8'] },
    ],
  },
};

const STANDARD_END_CONDITIONS = [
  { id: 'checkmate' },
  { id: 'stalemate' },
  { id: 'insufficientMaterial' },
  { id: 'repetition', options: { count: 3 } },
  { id: 'moveRule', options: { halfmoves: 100 } },
];

export const STANDARD = Object.freeze({
  id: 'standard',
  name: 'Cờ vua tiêu chuẩn',
  description: 'Luật FIDE: nhập thành, bắt tốt qua đường, phong cấp, hoà lặp 3 lần, luật 50 nước.',
  initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pieces: STANDARD_PIECES,
  rules: [STANDARD_CASTLING, { id: 'enPassant' }, { id: 'promotion' }],
  endConditions: STANDARD_END_CONDITIONS,
});

variantDefinitions.register(STANDARD.id, STANDARD);

variantDefinitions.register('kingOfTheHill', {
  ...STANDARD,
  id: 'kingOfTheHill',
  name: 'Vua trên đồi',
  description: 'Như cờ tiêu chuẩn, nhưng đưa Vua vào 4 ô trung tâm (d4, e4, d5, e5) là thắng.',
  endConditions: [
    { id: 'reachSquares', options: { squares: ['d4', 'e4', 'd5', 'e5'], reason: 'king_of_the_hill' } },
    ...STANDARD_END_CONDITIONS,
  ],
});

variantDefinitions.register('threeCheck', {
  ...STANDARD,
  id: 'threeCheck',
  name: 'Ba lần chiếu',
  description: 'Như cờ tiêu chuẩn, nhưng bên nào chiếu đối phương đủ 3 lần sẽ thắng.',
  endConditions: [{ id: 'checkCount', options: { count: 3 } }, ...STANDARD_END_CONDITIONS],
});
