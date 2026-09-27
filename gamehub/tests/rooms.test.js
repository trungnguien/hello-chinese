import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Clock } from '../shared/time/index.js';
import { createRooms, tick } from './helpers.js';

const alice = { id: 'a', name: 'Alice' };
const bob = { id: 'b', name: 'Bob' };

async function started(gameId, { seat, timeControlId = 'untimed', options } = {}) {
  const ctx = createRooms();
  const room = await ctx.rooms.create({ player: alice, gameId, options, timeControlId, seat });
  await ctx.rooms.join({ player: bob, roomId: room.id });
  return { ...ctx, room };
}

test('cờ vua qua RoomService: tạo, vào, hành động, đầu hàng — phát đúng sự kiện', async () => {
  const { rooms, room, events } = await started('chess', { seat: 'w' });
  assert.equal(room.status, 'active');
  await assert.rejects(rooms.act({ player: bob, roomId: room.id, action: { uci: 'e7e5' } }), { code: 'not_your_turn' });
  await assert.rejects(rooms.act({ player: alice, roomId: room.id, action: { uci: 'e2e5' } }), { code: 'illegal_move' });
  await assert.rejects(rooms.act({ player: alice, roomId: room.id, action: { foo: 1 } }), { code: 'illegal_action' });
  await rooms.act({ player: alice, roomId: room.id, action: { uci: 'e2e4' } });
  assert.deepEqual(room.log, [{ seat: 'w', text: 'e4' }]);
  await rooms.resign({ player: bob, roomId: room.id });
  await tick();
  assert.deepEqual(room.result, { winners: ['w'], reason: 'resignation' });
  const types = events.map((e) => e.type);
  for (const t of ['room.created', 'room.started', 'room.acted', 'room.ended', 'room.updated', 'lobby.changed']) {
    assert.ok(types.includes(t), `missing ${t}`);
  }
});

test('lựa chọn được chuẩn hoá theo manifest; game lạ bị từ chối', async () => {
  const { rooms } = createRooms();
  const r = await rooms.create({ player: alice, gameId: 'chess', options: { variant: 'nope' } });
  assert.deepEqual(r.options, { variant: 'standard' });
  await assert.rejects(rooms.create({ player: alice, gameId: 'go' }), { code: 'invalid_payload' });
});

test('caro qua CÙNG RoomService: X thắng hàng ngang', async () => {
  const { rooms, room } = await started('caro', { seat: 'x' });
  const moves = [
    [alice, 7, 3], [bob, 8, 3], [alice, 7, 4], [bob, 8, 4], [alice, 7, 5], [bob, 8, 5], [alice, 7, 6], [bob, 8, 6], [alice, 7, 7],
  ];
  for (const [p, row, col] of moves) await rooms.act({ player: p, roomId: room.id, action: { row, col } });
  assert.deepEqual(room.result, { winners: ['x'], reason: 'line_complete' });
  assert.equal(room.log.at(-1).text, 'H8');
});

test('người ngoài không thể hành động; phòng đầy thì không vào được', async () => {
  const { rooms, room } = await started('chess', { seat: 'w' });
  const eve = { id: 'e', name: 'Eve' };
  await assert.rejects(rooms.join({ player: eve, roomId: room.id }), { code: 'conflict' });
  await assert.rejects(rooms.act({ player: eve, roomId: room.id, action: { uci: 'e2e4' } }), { code: 'forbidden' });
  await assert.rejects(rooms.get('nope'), { code: 'not_found' });
});

test('mời hoà và chấp nhận', async () => {
  const { rooms, room } = await started('caro', { seat: 'x' });
  await rooms.offerDraw({ player: alice, roomId: room.id });
  assert.equal(room.drawOffer, 'x');
  await rooms.respondDraw({ player: bob, roomId: room.id, accept: true });
  assert.deepEqual(room.result, { winners: [], reason: 'agreement' });
});

test('hết giờ: bộ hẹn giờ tự kết thúc ván (đồng hồ theo ghế)', async () => {
  const { rooms, room, time } = await started('chess', { seat: 'w', timeControlId: 'blitz' });
  time.advance(10_000);
  await rooms.act({ player: alice, roomId: room.id, action: { uci: 'e2e4' } });
  assert.equal(room.clock.remaining('w'), 51_000); // 60s - 10s + 1s increment
  time.advance(61_000);
  assert.deepEqual(room.result, { winners: ['w'], reason: 'timeout' });
});

test('hết giờ nhưng đối thủ chỉ còn Vua -> hoà (module quyết định qua timeoutOutcome)', async () => {
  const { room } = await started('chess', { seat: 'w' });
  const outcome = room.match.timeoutOutcome('w');
  assert.deepEqual(outcome, { winners: ['b'], reason: 'timeout' });
});

test('Clock: delay không trừ giờ trong khoảng delay; hỗ trợ ghế tuỳ ý', () => {
  let now = 0;
  const clock = new Clock({ control: { kind: 'delay', initialMs: 10_000, delayMs: 3_000 }, seats: ['x', 'o'], now: () => now });
  clock.start('x');
  now = 2_000;
  assert.equal(clock.remaining('x'), 10_000);
  now = 5_000;
  assert.equal(clock.remaining('x'), 8_000);
  assert.equal(clock.msUntilFlag(), 8_000);
  clock.press('o');
  assert.deepEqual(clock.snapshot(), { remaining: { x: 8_000, o: 10_000 }, running: 'o' });
});
