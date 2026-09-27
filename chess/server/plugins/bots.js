import { botStrategies } from '../bots/strategies.js';

/**
 * Đối thủ máy — thêm hoàn toàn bằng composition (nguyên tắc 6):
 *  - register "opponent" vào registry để handler game.create dùng được,
 *  - nghe game.updated để biết tới lượt,
 *  - đi cờ qua ĐÚNG use case mà người thật dùng (services.games.move).
 *
 * options: { thinkMs: number, bots: [{ id, name, description, strategy }] }
 */
export default {
  name: 'bots',
  setup({ bus, services, registries }, { thinkMs = 600, bots = [] }) {
    const players = new Map();
    const timers = new Set();

    for (const def of bots) {
      const strategy = botStrategies.get(def.strategy);
      const player = { id: `bot:${def.id}`, name: def.name, isBot: true };
      players.set(player.id, { player, strategy });
      registries.opponents.register(player.id, {
        id: player.id,
        name: def.name,
        description: def.description,
        join: (gameId) => services.games.join({ player, gameId }),
      });
    }

    const thinking = new Set();
    const off = bus.on('game.updated', ({ session }) => {
      if (session.status !== 'active') return;
      const { game } = session;

      // Máy lịch sự từ chối lời mời hoà.
      if (session.drawOffer) {
        const bot = players.get(session.players[session.drawOffer === 'w' ? 'b' : 'w']?.id);
        if (bot) services.games.respondDraw({ player: bot.player, gameId: session.id, accept: false });
      }

      const bot = players.get(session.players[game.turn]?.id);
      const ply = game.history.length;
      const key = `${session.id}:${ply}`;
      if (!bot || thinking.has(key)) return;
      thinking.add(key);
      const timer = setTimeout(async () => {
        timers.delete(timer);
        thinking.delete(key);
        if (session.status !== 'active' || session.game.history.length !== ply) return;
        try {
          await services.games.move({ player: bot.player, gameId: session.id, uci: bot.strategy(session.game) });
        } catch (err) {
          console.error('[bots] move failed:', err.message);
        }
      }, thinkMs);
      timers.add(timer);
    });

    return () => {
      off();
      timers.forEach(clearTimeout);
    };
  },
};
