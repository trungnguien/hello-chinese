import { EventBus } from '/shared/core/EventBus.js';
import { Registry } from '/shared/core/Registry.js';
import { C2S } from '/shared/protocol/contract.js';
import { clientTransports } from './net/transports.js';
import { ServerConnection } from './net/ServerConnection.js';
import { Store, initialState } from './state/Store.js';
import { serverHandlers } from './state/serverHandlers.js';
import { LobbyView } from './ui/LobbyView.js';
import { GameView } from './ui/GameView.js';
import { texts } from './ui/texts.js';
import { pieceSets } from './ui/pieceSets.js';
import sound from './effects/sound.js';
import title from './effects/title.js';
import toast from './effects/toast.js';

/**
 * COMPOSITION ROOT phía client: lắp ráp transport, connection, store, view, effect.
 * Các phần chỉ nói chuyện với nhau qua bus + contract.
 */
const storage = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* chế độ riêng tư — bỏ qua */
    }
  },
};

const bus = new EventBus();
const store = new Store({ bus, initial: initialState });

// Late binding: server cho biết dùng transport nào.
const clientConfig = await fetch('/api/client-config')
  .then((r) => r.json())
  .catch(() => ({ transport: { kind: 'websocket', path: '/ws' } }));
const transport = clientTransports.get(clientConfig.transport.kind)(clientConfig.transport);
const connection = new ServerConnection({ transport, bus });

for (const [type, handler] of serverHandlers.entries()) bus.on(`server:${type}`, (payload) => handler(store, payload, bus));

// ---- Views -----------------------------------------------------------------
const pieceSet = pieceSets[storage.get('chess.pieceSet')] ?? pieceSets.unicode;
const views = { lobby: new LobbyView({ bus }), game: new GameView({ bus, pieceSet, texts }) };
const main = document.getElementById('app');
const connectionBadge = document.getElementById('connection');

bus.on('state.changed', ({ state }) => {
  const view = views[state.route.view];
  if (main.firstElementChild !== view.el) main.replaceChildren(view.el);
  view.render(state);
  connectionBadge.dataset.state = state.connection;
  connectionBadge.textContent = { online: 'Trực tuyến', offline: 'Mất kết nối…', connecting: 'Đang kết nối…' }[state.connection];
});

for (const effect of [sound, title, toast]) effect.setup({ bus, store, texts });

// ---- Routing (hash) --------------------------------------------------------
function parseRoute() {
  const m = /^#\/game\/([\w-]+)$/.exec(location.hash);
  return m ? { view: 'game', gameId: m[1] } : { view: 'lobby' };
}

function applyRoute() {
  const prev = store.get().route;
  const route = parseRoute();
  if (prev.view === 'game' && prev.gameId !== route.gameId) {
    const old = store.get().games[prev.gameId];
    if (old && !old.you) connection.send(C2S.GAME_LEAVE, { gameId: prev.gameId });
  }
  store.update(() => ({ route, ui: { ...store.get().ui, flipped: false } }));
  if (route.view === 'game' && store.get().me) watchCurrent();
}

function watchCurrent() {
  const { route } = store.get();
  if (route.view !== 'game') return;
  connection.request(C2S.GAME_WATCH, { gameId: route.gameId }).catch((err) => {
    bus.emit('notice', { code: err.code, message: err.message, error: true });
    location.hash = '';
  });
}

window.addEventListener('hashchange', applyRoute);

// ---- Intents: UI muốn gì -> lời gọi protocol --------------------------------
/** Registry intent: thêm hành động mới = thêm một mục (nguyên tắc 6). */
const intents = new Registry('intent');
const currentGameId = () => store.get().route.gameId;
const report = (err) => bus.emit('notice', { code: err.code, message: err.message, error: true });
const goToGame = (gameId) => (location.hash = `#/game/${gameId}`);

intents
  .register('intent.move', ({ uci }) => connection.request(C2S.GAME_MOVE, { gameId: currentGameId(), uci }))
  .register('intent.create', async (p) => goToGame((await connection.request(C2S.GAME_CREATE, p)).gameId))
  .register('intent.join', async ({ gameId }) => goToGame((await connection.request(C2S.GAME_JOIN, { gameId })).gameId))
  .register('intent.joinCurrent', () => connection.request(C2S.GAME_JOIN, { gameId: currentGameId() }))
  .register('intent.open', ({ gameId }) => goToGame(gameId))
  .register('intent.lobby', () => (location.hash = ''))
  .register('intent.cancel', async () => {
    await connection.request(C2S.GAME_LEAVE, { gameId: currentGameId() });
    location.hash = '';
  })
  .register('intent.resign', () => {
    if (confirm('Bạn chắc chắn muốn đầu hàng?')) return connection.request(C2S.GAME_RESIGN, { gameId: currentGameId() });
  })
  .register('intent.offerDraw', () => connection.request(C2S.GAME_OFFER_DRAW, { gameId: currentGameId() }))
  .register('intent.respondDraw', ({ accept }) => connection.request(C2S.GAME_RESPOND_DRAW, { gameId: currentGameId(), accept }))
  .register('intent.chat', ({ text }) => connection.request(C2S.CHAT_SEND, { gameId: currentGameId(), text }))
  .register('intent.flip', () => store.update((s) => ({ ui: { ...s.ui, flipped: !s.ui.flipped } })))
  .register('intent.rename', ({ name }) => {
    storage.set('chess.name', name);
    return hello();
  });

for (const [type, run] of intents.entries()) {
  bus.on(type, async (payload) => {
    try {
      await run(payload);
    } catch (err) {
      report(err);
    }
  });
}

// ---- Kết nối ---------------------------------------------------------------
async function hello() {
  const welcome = await connection.request(C2S.HELLO, {
    token: storage.get('chess.token') ?? undefined,
    name: storage.get('chess.name') ?? undefined,
  });
  return welcome;
}

bus.on('server:welcome', ({ player }) => {
  storage.set('chess.token', player.token);
  storage.set('chess.name', player.name);
});

bus.on('connection.open', async () => {
  store.update(() => ({ connection: 'online' }));
  try {
    await hello();
    watchCurrent();
  } catch (err) {
    report(err);
  }
});
bus.on('connection.closed', () => store.update(() => ({ connection: 'offline' })));

applyRoute();
connection.connect();
