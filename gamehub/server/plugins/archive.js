import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Lưu mỗi ván đã kết thúc: một file JSON "replay" chung cho MỌI game
 * (module + phiên bản + lựa chọn + seed + nhật ký hành động — đủ để phát lại),
 * cộng thêm các định dạng riêng mà module khai báo trong `exporters` (vd. PGN cho cờ vua).
 */
export default {
  name: 'archive',
  async setup({ bus, registries }, { dir = 'data/games' } = {}) {
    await mkdir(dir, { recursive: true });

    const off = bus.on('room.ended', async ({ room, result }) => {
      const { manifest, exporters = {} } = room.module;
      const names = Object.fromEntries(Object.entries(room.players).map(([seat, p]) => [seat, p?.name ?? '?']));
      const base = path.join(dir, `${new Date(room.createdAt).toISOString().slice(0, 10)}-${manifest.id}-${room.id}`);
      const replay = {
        game: manifest.id,
        version: manifest.version,
        options: room.options,
        seed: room.meta.seed,
        timeControl: room.timeControl.id,
        players: names,
        actions: room.actions,
        log: room.log,
        result,
        createdAt: room.createdAt,
        endedAt: room.endedAt,
      };
      await writeFile(`${base}.json`, JSON.stringify(replay, null, 2));
      for (const exporter of Object.values(exporters)) {
        const { extension, content } = exporter({ room, names });
        await writeFile(`${base}.${extension}`, content);
      }
    });

    registries.httpRoutes.register('GET /api/archive', async () => {
      const files = (await readdir(dir)).sort().reverse();
      return { files: files.slice(0, 200) };
    });

    return off;
  },
};
