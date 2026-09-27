import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../shared/core/EventBus.js';
import { Registry } from '../shared/core/Registry.js';
import { buildVariant, variantDefinitions } from '../shared/engine/index.js';
import { timeControlKinds, Clock } from '../shared/time/index.js';
import { GameService } from '../server/app/GameService.js';
import { createMemoryRepository } from '../server/adapters/storage/memory.js';

/** Scheduler giả: điều khiển thời gian bằng tay (nhờ phụ thuộc vào abstraction). */
function fakeTime() {
  let now = 0;
  let timers = [];
  return {
    now: () => now,
    scheduler: {
      setTimeout: (fn, ms) => {
        const t = { fn, at: now + ms };
        timers.push(t);
        return t;
      },
      clearTimeout: (t) => (timers = timers.filter((x) => x !== t)),
    },
    advance(ms) {
      now += ms;
      const due = timers.filter((t) => t.at <= now);
      timers = timers.filter((t) => t.at > now);
      due.forEach((t) => t.fn());
    },
  };
}

function setup() {
  const time = fakeTime();
  const bus = new EventBus();
  const events = [];
  bus.on('*', (type, payload) => events.push({ type, payload }));
  const variants = new Registry('variant').register('standard', buildVariant(variantDefinitions.get('standard')));
  const timeControls = new Registry('tc')
    .register('blitz', { id: 'blitz', label: '1+1', kind: 'fischer', initialMs: 60000, incrementMs: 1000 })
    .register('untimed', { id: 'untimed', label: '∞', kind: 'untimed' });
  const games = new GameService({
    repository: createMemoryRepository(),
    variants,
    timeControls,
    clockKinds: timeControlKinds,
    bus,
    scheduler: time.scheduler,
    now: time.now,
  });
  const alice = { id: 'a', name: 'Alice' };
  const bob = { id: 'b', name: 'Bob' };
  return { time, bus, events, games, alice, bob };
}

const tick = () => new Promise((r) => setImmediate(r));

test('tạo, vào phòng, đi cờ, đầu hàng — phát đúng sự kiện', async () => {
  const { games, alice, bob, events } = setup();
  const s = await games.create({ player: alice, variantId: 'standard', timeControlId: 'untimed', color: 'w' });
  assert.equal(s.status, 'waiting');
  await games.join({ player: bob, gameId: s.id });
  assert.equal(s.status, 'active');
  await assert.rejects(games.move({ player: bob, gameId: s.id, uci: 'e7e5' }), { code: 'not_your_turn' });
  await assert.rejects(games.move({ player: alice, gameId: s.id, uci: 'e2e5' }), { code: 'illegal_move' });
  await games.move({ player: alice, gameId: s.id, uci: 'e2e4' });
  await games.resign({ player: bob, gameId: s.id });
  await tick();
  assert.equal(s.status, 'ended');
  assert.deepEqual(s.game.result, { winner: 'w', reason: 'resignation', score: '1-0' });
  const types = events.map((e) => e.type);
  for (const t of ['game.created', 'game.started', 'game.moved', 'game.ended', 'game.updated', 'lobby.changed']) {
    assert.ok(types.includes(t), `missing ${t}`);
  }
});

test('người ngoài không thể đi cờ; phòng đầy thì không vào được', async () => {
  const { games, alice, bob } = setup();
  const s = await games.create({ player: alice, variantId: 'standard', timeControlId: 'untimed', color: 'w' });
  await games.join({ player: bob, gameId: s.id });
  const eve = { id: 'e', name: 'Eve' };
  await assert.rejects(games.join({ player: eve, gameId: s.id }), { code: 'conflict' });
  await assert.rejects(games.move({ player: eve, gameId: s.id, uci: 'e2e4' }), { code: 'forbidden' });
  await assert.rejects(games.get('nope'), { code: 'not_found' });
});

test('mời hoà và chấp nhận', async () => {
  const { games, alice, bob } = setup();
  const s = await games.create({ player: alice, variantId: 'standard', timeControlId: 'untimed', color: 'w' });
  await games.join({ player: bob, gameId: s.id });
  await games.offerDraw({ player: alice, gameId: s.id });
  assert.equal(s.drawOffer, 'w');
  await games.respondDraw({ player: bob, gameId: s.id, accept: true });
  assert.equal(s.game.result.reason, 'agreement');
});

test('hết giờ: bộ hẹn giờ tự kết thúc ván', async () => {
  const { games, alice, bob, time } = setup();
  const s = await games.create({ player: alice, variantId: 'standard', timeControlId: 'blitz', color: 'w' });
  await games.join({ player: bob, gameId: s.id });
  time.advance(10_000);
  await games.move({ player: alice, gameId: s.id, uci: 'e2e4' });
  assert.equal(s.clock.remaining('w'), 51_000); // 60s - 10s + 1s increment
  time.advance(61_000);
  assert.equal(s.status, 'ended');
  assert.deepEqual(s.game.result, { winner: 'w', reason: 'timeout', score: '1-0' });
});

test('Clock: delay không trừ giờ trong khoảng delay', () => {
  let now = 0;
  const clock = new Clock({ control: { kind: 'delay', initialMs: 10_000, delayMs: 3_000 }, now: () => now });
  clock.start('w');
  now = 2_000;
  assert.equal(clock.remaining('w'), 10_000);
  now = 5_000;
  assert.equal(clock.remaining('w'), 8_000);
  assert.equal(clock.msUntilFlag(), 8_000);
});
