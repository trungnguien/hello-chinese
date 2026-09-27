import { EventBus } from '/shared/core/EventBus.js';
import { Registry } from '/shared/core/Registry.js';
import { C2S } from '/shared/protocol/contract.js';
import { clientTransports } from './net/transports.js';
import { ServerConnection } from './net/ServerConnection.js';
import { Store, initialState } from './state/Store.js';
import { serverHandlers } from './state/serverHandlers.js';
import { MarketView } from './ui/MarketView.js';
import { LobbyView } from './ui/LobbyView.js';
import { RoomView } from './ui/RoomView.js';
import { texts } from './ui/texts.js';
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
const views = { market: new MarketView({ bus }), lobby: new LobbyView({ bus }), room: new RoomView({ bus, texts }) };
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
//   #/                      chợ game
//   #/g/<gameId>            sảnh của một game
//   #/g/<gameId>/r/<roomId> phòng chơi
function parseRoute() {
  const m = /^#\/g\/([\w-]+)(?:\/r\/([\w-]+))?$/.exec(location.hash);
  if (!m) return { view: 'market' };
  return m[2] ? { view: 'room', gameId: m[1], roomId: m[2] } : { view: 'lobby', gameId: m[1] };
}

function applyRoute() {
  const prev = store.get().route;
  const route = parseRoute();
  if (prev.view === 'room' && prev.roomId !== route.roomId) {
    const old = store.get().rooms[prev.roomId];
    if (old && !old.you) connection.send(C2S.ROOM_LEAVE, { roomId: prev.roomId });
  }
  store.update(() => ({ route, ui: { ...store.get().ui, flipped: false } }));
  if (route.view === 'room' && store.get().me) watchCurrent();
}

function watchCurrent() {
  const { route } = store.get();
  if (route.view !== 'room') return;
  connection.request(C2S.ROOM_WATCH, { roomId: route.roomId }).catch((err) => {
    bus.emit('notice', { code: err.code, message: err.message, error: true });
    location.hash = `#/g/${route.gameId}`;
  });
}

window.addEventListener('hashchange', applyRoute);

// ---- Intents: UI muốn gì -> lời gọi protocol --------------------------------
/** Registry intent: thêm hành động mới = thêm một mục (nguyên tắc 6). */
const intents = new Registry('intent');
const currentRoomId = () => store.get().route.roomId;
const report = (err) => bus.emit('notice', { code: err.code, message: err.message, error: true });
const goToRoom = (gameId, roomId) => (location.hash = `#/g/${gameId}/r/${roomId}`);

intents
  .register('intent.action', ({ action }) => connection.request(C2S.ROOM_ACTION, { roomId: currentRoomId(), action }))
  .register('intent.create', async (p) => {
    const { roomId, game } = await connection.request(C2S.ROOM_CREATE, p);
    goToRoom(game, roomId);
  })
  .register('intent.join', async ({ gameId, roomId }) => {
    await connection.request(C2S.ROOM_JOIN, { roomId });
    goToRoom(gameId, roomId);
  })
  .register('intent.joinCurrent', () => connection.request(C2S.ROOM_JOIN, { roomId: currentRoomId() }))
  .register('intent.open', ({ gameId, roomId }) => goToRoom(gameId, roomId))
  .register('intent.game', ({ gameId }) => (location.hash = `#/g/${gameId}`))
  .register('intent.market', () => (location.hash = ''))
  .register('intent.back', () => (location.hash = `#/g/${store.get().route.gameId}`))
  .register('intent.cancel', async () => {
    await connection.request(C2S.ROOM_LEAVE, { roomId: currentRoomId() });
    location.hash = `#/g/${store.get().route.gameId}`;
  })
  .register('intent.resign', () => {
    if (confirm('Bạn chắc chắn muốn đầu hàng?')) return connection.request(C2S.ROOM_RESIGN, { roomId: currentRoomId() });
  })
  .register('intent.offerDraw', () => connection.request(C2S.ROOM_OFFER_DRAW, { roomId: currentRoomId() }))
  .register('intent.respondDraw', ({ accept }) => connection.request(C2S.ROOM_RESPOND_DRAW, { roomId: currentRoomId(), accept }))
  .register('intent.chat', ({ text }) => connection.request(C2S.CHAT_SEND, { roomId: currentRoomId(), text }))
  .register('intent.flip', () => store.update((s) => ({ ui: { ...s.ui, flipped: !s.ui.flipped } })))
  .register('intent.rename', ({ name }) => {
    storage.set('gamehub.name', name);
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
    token: storage.get('gamehub.token') ?? undefined,
    name: storage.get('gamehub.name') ?? undefined,
  });
  return welcome;
}

bus.on('server:welcome', ({ player }) => {
  storage.set('gamehub.token', player.token);
  storage.set('gamehub.name', player.name);
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
