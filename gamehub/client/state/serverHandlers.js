import { Registry } from '/shared/core/Registry.js';
import { S2C } from '/shared/protocol/contract.js';

/**
 * Ánh xạ message server -> cập nhật store. Loại message mới = thêm một mục.
 * Message không có trong registry sẽ bị bỏ qua (tolerant reader — nguyên tắc 5).
 */
export const serverHandlers = new Registry('server message handler');

serverHandlers.register(S2C.WELCOME, (store, p) => store.update(() => ({ me: p.player, catalog: p.catalog })));

serverHandlers.register(S2C.LOBBY_STATE, (store, p) => store.update(() => ({ lobby: p.rooms })));

serverHandlers.register(S2C.ROOM_STATE, (store, p, bus) => {
  const prev = store.get().rooms[p.id];
  store.update((s) => ({ rooms: { ...s.rooms, [p.id]: { ...p, receivedAt: performance.now() } } }));
  if (prev && p.log.length > prev.log.length) bus.emit('room.acted', { room: p, entry: p.log.at(-1) });
  if (prev && !prev.result && p.result) bus.emit('room.ended', { room: p });
  if (prev && prev.status === 'waiting' && p.status === 'active') bus.emit('room.started', { room: p });
});

serverHandlers.register(S2C.CHAT_MESSAGE, (store, p) =>
  store.update((s) => ({ chat: { ...s.chat, [p.roomId]: [...(s.chat[p.roomId] ?? []), p].slice(-100) } })),
);

serverHandlers.register(S2C.NOTICE, (store, p, bus) => bus.emit('notice', p));

serverHandlers.register(S2C.ERROR, (store, p, bus) => bus.emit('notice', { code: p.code, message: p.message, error: true }));
