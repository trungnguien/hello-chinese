import { EventBus } from '../shared/core/EventBus.js';
import { Registry } from '../shared/core/Registry.js';
import { timeControlKinds } from '../shared/time/index.js';
import { RoomService } from '../server/app/RoomService.js';
import { createMemoryRepository } from '../server/adapters/storage/memory.js';
import chess from '../games/chess/server.js';
import caro from '../games/caro/server.js';

export const ALL_GAMES = [chess, caro];

/** Scheduler giả: điều khiển thời gian bằng tay (nhờ phụ thuộc vào abstraction). */
export function fakeTime() {
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

export function createRooms({ time = fakeTime(), games = ALL_GAMES } = {}) {
  const bus = new EventBus();
  const events = [];
  bus.on('*', (type, payload) => events.push({ type, payload }));
  const registry = new Registry('game');
  for (const g of games) registry.register(g.manifest.id, g);
  const timeControls = new Registry('tc')
    .register('blitz', { id: 'blitz', label: '1+1', kind: 'fischer', initialMs: 60000, incrementMs: 1000 })
    .register('untimed', { id: 'untimed', label: '∞', kind: 'untimed' });
  const rooms = new RoomService({
    repository: createMemoryRepository(),
    games: registry,
    timeControls,
    clockKinds: timeControlKinds,
    bus,
    scheduler: time.scheduler,
    now: time.now,
  });
  return { bus, events, rooms, time };
}

export const tick = () => new Promise((r) => setImmediate(r));
