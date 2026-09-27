import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { toPgn } from '../../shared/engine/index.js';

/**
 * Lưu mỗi ván đã kết thúc thành file PGN và mở route GET /api/archive.
 * Tính năng mới hoàn toàn nhờ lắng nghe 'game.ended' + registry route.
 */
export default {
  name: 'pgnArchive',
  async setup({ bus, registries }, { dir = 'data/games' } = {}) {
    await mkdir(dir, { recursive: true });

    const off = bus.on('game.ended', async ({ session, result }) => {
      const date = new Date(session.createdAt);
      const pgn = toPgn({
        tags: {
          Event: `Online ${session.variant.name}`,
          Site: 'online-chess',
          Date: date.toISOString().slice(0, 10).replace(/-/g, '.'),
          White: session.players.w?.name ?? '?',
          Black: session.players.b?.name ?? '?',
          Result: result.score,
          Variant: session.variant.id,
          TimeControl: session.timeControl.label,
          Termination: result.reason,
          ...(session.game.startFen !== session.variant.initialFen ? { FEN: session.game.startFen } : {}),
        },
        moves: session.game.history.map((h) => h.san),
        result: result.score,
      });
      await writeFile(path.join(dir, `${date.toISOString().slice(0, 10)}-${session.id}.pgn`), pgn);
    });

    registries.httpRoutes.register('GET /api/archive', async () => {
      const files = (await readdir(dir)).filter((f) => f.endsWith('.pgn')).sort().reverse();
      return { games: files.slice(0, 100) };
    });

    return off;
  },
};
