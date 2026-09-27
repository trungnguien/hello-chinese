import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, buildVariant, variantDefinitions, parseFen, Game, toUci } from '../games/chess/engine/index.js';

const standard = buildVariant(variantDefinitions.get('standard'));
const engine = new Engine(standard);

function perft(pos, depth) {
  if (depth === 0) return 1;
  const moves = engine.legalMoves(pos);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perft(engine.apply(pos, m), depth - 1);
  return n;
}

test('perft từ thế khai cuộc', () => {
  const pos = parseFen(standard.initialFen);
  assert.equal(perft(pos, 1), 20);
  assert.equal(perft(pos, 2), 400);
  assert.equal(perft(pos, 3), 8902);
});

test('perft Kiwipete (nhập thành, ep, phong cấp)', () => {
  const pos = parseFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  assert.equal(perft(pos, 1), 48);
  assert.equal(perft(pos, 2), 2039);
  assert.equal(perft(pos, 3), 97862);
});

test('perft vị trí 3 (ep lộ chiếu ngang)', () => {
  const pos = parseFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
  assert.equal(perft(pos, 4), 43238);
});

test('perft vị trí 4 (phong cấp)', () => {
  const pos = parseFen('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1');
  assert.equal(perft(pos, 3), 9467);
});

test('Scholar mate kết thúc bằng chiếu hết và SAN đúng', () => {
  const game = new Game({ variant: standard });
  const ended = [];
  game.events.on('ended', ({ result }) => ended.push(result));
  for (const uci of ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7']) game.play(uci);
  assert.deepEqual(game.history.map((h) => h.san), ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']);
  assert.deepEqual(ended, [{ winner: 'w', reason: 'checkmate', score: '1-0' }]);
  assert.throws(() => game.play('a7a6'), { code: 'game_over' });
});

test('nước đi không hợp lệ bị từ chối', () => {
  const game = new Game({ variant: standard });
  assert.throws(() => game.play('e2e5'), { code: 'illegal_move' });
});

test('lặp lại 3 lần -> hoà', () => {
  const game = new Game({ variant: standard });
  for (const uci of ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']) game.play(uci);
  assert.equal(game.result?.reason, 'repetition');
});

test('King of the Hill: vua vào trung tâm là thắng', () => {
  const koth = buildVariant(variantDefinitions.get('kingOfTheHill'));
  const game = new Game({ variant: koth, fen: '4k3/8/8/8/8/4K3/8/8 w - - 0 1' });
  game.play('e3e4');
  assert.deepEqual(game.result, { winner: 'w', reason: 'king_of_the_hill', score: '1-0' });
});

test('Three-check: chiếu đủ 3 lần là thắng', () => {
  const tc = buildVariant(variantDefinitions.get('threeCheck'));
  const game = new Game({ variant: tc, fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1' });
  for (const uci of ['a1a8', 'e8e7', 'a8a7', 'e7e6', 'a7a6']) game.play(uci);
  assert.equal(game.result?.reason, 'check_count');
  assert.equal(game.result?.winner, 'w');
});

test('phong cấp sinh 4 lựa chọn', () => {
  const game = new Game({ variant: standard, fen: '8/P7/8/8/8/8/8/k6K w - - 0 1' });
  const promos = game.legalMoves().filter((m) => m.piece.type === 'p').map(toUci).sort();
  assert.deepEqual(promos, ['a7a8b', 'a7a8n', 'a7a8q', 'a7a8r']);
  assert.equal(game.play('a7a8q').san, 'a8=Q+'); // Hậu mới trên a8 chiếu vua a1
});
