import { botSkills } from '../bots/skills/index.js';
import { systemScheduler } from '../app/ports.js';

/** Bot chung cho mọi game có legalActions — dùng khi module không tự cung cấp chiến lược. */
const GENERIC_STRATEGIES = {
  random: (match, seat) => {
    const actions = match.legalActions?.(seat) ?? [];
    return actions[Math.floor(Math.random() * actions.length)];
  },
};

/**
 * Đối thủ máy cho MỌI game — thêm hoàn toàn bằng composition (nguyên tắc 6):
 *  - `strategy` trong cấu hình là một id (vd. 'greedy'); lúc chơi mới tra xem
 *    module game có chiến lược đó không (late binding), nếu không thì dùng bản chung,
 *  - nghe room.updated để biết tới lượt, hành động qua ĐÚNG use case người thật dùng,
 *  - gắn thêm KỸ NĂNG khai báo trong cấu hình (bots/skills), ví dụ tán gẫu.
 *
 * options: { thinkMs, bots: [{ id, name, description, strategy, skills?: [{ id, options }] }] }
 */
export default {
  name: 'bots',
  setup({ bus, services, registries }, { thinkMs = 600, bots = [] }) {
    const players = new Map();
    const timers = new Set();
    const skillTeardowns = [];

    const strategyFor = (module, id) => {
      const own = module.bots?.[id];
      if (own) return own;
      const generic = GENERIC_STRATEGIES[id];
      return generic && typeof module.createMatch === 'function' ? generic : null;
    };

    for (const def of bots) {
      const player = { id: `bot:${def.id}`, name: def.name, isBot: true };
      players.set(player.id, { player, strategyId: def.strategy });
      registries.opponents.register(player.id, {
        id: player.id,
        name: def.name,
        description: def.description,
        supports: (gameId) => {
          const module = registries.games.find(gameId);
          return Boolean(module && strategyFor(module, def.strategy));
        },
        join: (roomId) => services.rooms.join({ player, roomId }),
      });
      for (const ref of def.skills ?? []) {
        const teardown = botSkills.get(ref.id)({ bus, services, player, scheduler: systemScheduler, options: ref.options });
        if (typeof teardown === 'function') skillTeardowns.push(teardown);
      }
    }

    const thinking = new Set();
    const off = bus.on('room.updated', ({ room }) => {
      if (room.status !== 'active') return;

      // Máy lịch sự từ chối lời mời hoà của người khác.
      if (room.drawOffer) {
        const botSeat = room.opponentsOf(room.drawOffer).find((s) => players.has(room.players[s]?.id));
        if (botSeat) services.rooms.respondDraw({ player: room.players[botSeat], roomId: room.id, accept: false });
      }

      for (const seat of room.match.activeSeats()) {
        const bot = players.get(room.players[seat]?.id);
        const ply = room.actions.length;
        const key = `${room.id}:${ply}:${seat}`;
        if (!bot || thinking.has(key)) continue;
        thinking.add(key);
        const timer = setTimeout(async () => {
          timers.delete(timer);
          thinking.delete(key);
          if (room.status !== 'active' || room.actions.length !== ply) return;
          try {
            const action = strategyFor(room.module, bot.strategyId)(room.match, seat);
            await services.rooms.act({ player: bot.player, roomId: room.id, action });
          } catch (err) {
            console.error('[bots] action failed:', err.message);
          }
        }, thinkMs);
        timers.add(timer);
      }
    });

    return () => {
      off();
      timers.forEach(clearTimeout);
      skillTeardowns.forEach((fn) => fn());
    };
  },
};
