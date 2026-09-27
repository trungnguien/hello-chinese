import { test } from 'node:test';
import assert from 'node:assert/strict';
import caro from '../games/caro/server.js';
import { greedyMove } from '../games/caro/bots.js';

const newMatch = (variant) => caro.createMatch({ options: { variant }, seats: ['x', 'o'] });
const play = (match, moves) => {
  for (const [row, col] of moves) match.act(match.activeSeats()[0], { row, col });
};

test('Caro: thắng chéo 5 quân', () => {
  const m = newMatch('freestyle');
  play(m, [[0, 0], [0, 5], [1, 1], [0, 6], [2, 2], [0, 7], [3, 3], [0, 8], [4, 4]]);
  assert.deepEqual(m.outcome(), { winners: ['x'], reason: 'line_complete' });
  assert.equal(m.view().winLine.length, 5);
});

test('Caro chặn hai đầu: hàng 5 bị chặn hai đầu KHÔNG thắng, tự do thì thắng', () => {
  // O chặn sẵn hai đầu hàng 7 (cột 2 và cột 8), X xếp cột 3..7.
  const moves = [[5, 5], [7, 2], [7, 3], [7, 8], [7, 4], [0, 0], [7, 5], [0, 14], [7, 6], [14, 0], [7, 7]];
  const vn = newMatch('vietnam');
  play(vn, moves);
  assert.equal(vn.outcome(), null);
  const free = newMatch('freestyle');
  play(free, moves);
  assert.deepEqual(free.outcome(), { winners: ['x'], reason: 'line_complete' });
});

test('Tic-tac-toe: hoà khi hết ô', () => {
  const m = newMatch('tictactoe');
  play(m, [[0, 0], [1, 1], [2, 2], [0, 2], [2, 0], [1, 0], [1, 2], [2, 1], [0, 1]]);
  assert.deepEqual(m.outcome(), { winners: [], reason: 'board_full' });
});

test('Caro: ô đã có quân bị từ chối; nước tạo đe doạ có note "threat"', () => {
  const m = newMatch('freestyle');
  m.act('x', { row: 7, col: 7 });
  assert.throws(() => m.act('o', { row: 7, col: 7 }), { code: 'illegal_action' });
  play(m, [[0, 0], [7, 8], [0, 1], [7, 9], [0, 3]]);
  const res = m.act('x', { row: 7, col: 10 }); // 4 quân liên tiếp -> đe doạ thắng
  assert.ok(res.notes.some((n) => n.kind === 'threat'));
});

test('Bot tham lam: thắng khi có thể, chặn khi đối thủ sắp thắng', () => {
  const win = newMatch('freestyle');
  play(win, [[7, 3], [0, 0], [7, 4], [0, 1], [7, 5], [0, 2], [7, 6], [14, 14]]);
  const w = greedyMove(win, 'x');
  assert.ok([[7, 2], [7, 7]].some(([r, c]) => r === w.row && c === w.col), 'X đi nước thắng');

  const block = newMatch('freestyle');
  play(block, [[7, 3], [0, 0], [7, 4], [0, 14], [7, 5], [14, 0], [7, 6]]);
  const b = greedyMove(block, 'o');
  assert.ok([[7, 2], [7, 7]].some(([r, c]) => r === b.row && c === b.col), 'O chặn');
});
