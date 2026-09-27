import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EventBus } from '../shared/core/EventBus.js';
import { Registry } from '../shared/core/Registry.js';
import { assertGameModule, publicManifest } from '../shared/gameModule.js';
import { timeControlKinds } from '../shared/time/index.js';
import { RoomService } from './app/RoomService.js';
import { PlayerDirectory } from './app/PlayerDirectory.js';
import { ConnectionHub } from './delivery/ConnectionHub.js';
import { MessageRouter } from './delivery/MessageRouter.js';
import { defaultHandlers } from './handlers/index.js';
import { createHttpServer } from './adapters/http/server.js';
import { createMemoryRepository } from './adapters/storage/memory.js';
import { createWebSocketTransport } from './adapters/transport/websocket.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/**
 * COMPOSITION ROOT — nơi duy nhất biết tới các lớp cụ thể.
 * Mọi thứ khác chỉ nhận abstraction đã được lắp ráp sẵn (nguyên tắc 1 & 2).
 */
export function createRegistries() {
  const registries = {
    transports: new Registry('transport'),
    repositories: new Registry('storage'),
    handlers: new Registry('message handler'),
    opponents: new Registry('opponent'),
    httpRoutes: new Registry('http route'),
    games: new Registry('game'),
    timeControls: new Registry('time control'),
  };
  registries.transports.register('websocket', createWebSocketTransport);
  registries.repositories.register('memory', createMemoryRepository);
  for (const handler of defaultHandlers) registries.handlers.register(handler.type, handler);
  return registries;
}

export async function createApp(config, { registries = createRegistries(), logger = console } = {}) {
  const bus = new EventBus({ onError: (err, type) => logger.error(`[bus] ${type}:`, err) });

  // Late binding: đường dẫn module game trong cấu hình -> module thật, kiểm tra contract khi nạp.
  const gameDirs = new Map();
  for (const entry of config.games) {
    const file = path.resolve(here, entry.module);
    const module = assertGameModule((await import(pathToFileURL(file).href)).default, entry.module);
    registries.games.register(module.manifest.id, module);
    gameDirs.set(module.manifest.id, path.join(path.dirname(file), module.manifest.client?.dir ?? 'client'));
  }
  for (const tc of config.timeControls) {
    timeControlKinds.get(tc.kind); // báo lỗi sớm nếu cấu hình sai
    registries.timeControls.register(tc.id, tc);
  }
  const repository = registries.repositories.get(config.storage.kind)(config.storage.options);
  const transport = registries.transports.get(config.transport.kind)(config.transport.options);

  const hub = new ConnectionHub({ bus });
  const services = {
    players: new PlayerDirectory(),
    rooms: new RoomService({
      repository,
      games: registries.games,
      timeControls: registries.timeControls,
      clockKinds: timeControlKinds,
      bus,
    }),
    catalog: () => ({
      games: registries.games.entries().map(([id, module]) => ({
        ...publicManifest(module.manifest),
        opponents: registries.opponents
          .entries()
          .filter(([, o]) => o.supports(id))
          .map(([oid, o]) => ({ id: oid, name: o.name, description: o.description })),
      })),
      timeControls: registries.timeControls.entries().map(([, tc]) => ({ id: tc.id, label: tc.label, kind: tc.kind })),
    }),
  };
  const context = { bus, hub, services, registries, config };

  registries.httpRoutes.register('GET /api/health', async () => ({ ok: true }));
  registries.httpRoutes.register('GET /api/catalog', async () => services.catalog());
  registries.httpRoutes.register('GET /api/client-config', async () => ({ transport: transport.clientConfig() }));

  const teardowns = [];
  for (const { module, options = {} } of config.plugins ?? []) {
    const url = module.startsWith('.') ? pathToFileURL(path.resolve(here, module)).href : module;
    const plugin = (await import(url)).default;
    const teardown = await plugin.setup(context, options);
    if (typeof teardown === 'function') teardowns.push(teardown);
    logger.log?.(`[plugin] ${plugin.name} loaded`);
  }

  const router = new MessageRouter({ handlers: registries.handlers, context, logger });
  const httpServer = createHttpServer({
    mounts: [
      { prefix: '/shared/', dir: path.join(root, 'shared') },
      // Mỗi module game chỉ lộ thư mục client của nó.
      ...[...gameDirs].map(([id, dir]) => ({ prefix: `/games/${id}/`, dir })),
      { prefix: '/', dir: path.join(root, 'client') },
    ],
    routes: registries.httpRoutes,
  });
  transport.attach(httpServer, (connection) => {
    hub.add(connection);
    connection.onMessage((raw) => router.handle(connection, raw));
    connection.onClose(() => hub.remove(connection));
  });

  return {
    context,
    httpServer,
    listen(port = config.http.port, host = config.http.host) {
      return new Promise((resolve) => httpServer.listen(port, host, () => resolve(httpServer.address())));
    },
    async close() {
      teardowns.reverse().forEach((fn) => fn());
      services.rooms.dispose();
      await transport.close();
      await new Promise((resolve) => httpServer.close(() => resolve()));
    },
  };
}
