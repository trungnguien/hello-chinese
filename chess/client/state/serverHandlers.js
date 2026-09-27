import { Registry } from '/shared/core/Registry.js';
import { S2C } from '/shared/protocol/contract.js';

/**
 * Ánh xạ message server -> cập nhật store. Loại message mới = thêm một mục.
 * Message không có trong registry sẽ bị bỏ qua (tolerant reader — nguyên tắc 5).
 */
export const serverHandlers = new Registry('server message handler');

serverHandlers.register(S2C.WELCOME, (store, p) => store.update(() => ({ me: p.player, catalog: p.catalog })));

serverHandlers.register(S2C.LOBBY_STATE, (store, p) => store.update(() => ({ lobby: p.games })));

serverHandlers.register(S2C.GAME_STATE, (store, p, bus) => {
  const prev = store.get().games[p.id];
  store.update((s) => ({ games: { ...s.games, [p.id]: { ...p, receivedAt: performance.now() } } }));
  if (prev && p.moves.length > prev.moves.length) bus.emit('game.moved', { game: p, move: p.moves.at(-1) });
  if (prev && !prev.result && p.result) bus.emit('game.ended', { game: p });
  if (prev && prev.status === 'waiting' && p.status === 'active') bus.emit('game.started', { game: p });
});

serverHandlers.register(S2C.CHAT_MESSAGE, (store, p) =>
  store.update((s) => ({ chat: { ...s.chat, [p.gameId]: [...(s.chat[p.gameId] ?? []), p].slice(-100) } })),
);

serverHandlers.register(S2C.NOTICE, (store, p, bus) => bus.emit('notice', p));

serverHandlers.register(S2C.ERROR, (store, p, bus) => bus.emit('notice', { code: p.code, message: p.message, error: true }));
