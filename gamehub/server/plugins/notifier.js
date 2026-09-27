import { encode, S2C } from '../../shared/protocol/contract.js';
import { toRoomState, toLobbyEntry } from '../app/snapshot.js';

/**
 * Nghe sự kiện nghiệp vụ -> đẩy message theo contract tới client.
 * RoomService không biết plugin này tồn tại (nguyên tắc 4).
 */
export default {
  name: 'notifier',
  setup({ bus, hub, services }) {
    const offs = [
      bus.on('room.updated', ({ room }) => {
        for (const id of room.participants()) hub.sendToPlayer(id, encode(S2C.ROOM_STATE, toRoomState(room, id)));
      }),
      bus.on('chat.posted', ({ room, from, text, at }) => {
        const msg = encode(S2C.CHAT_MESSAGE, { roomId: room.id, from, text, at });
        for (const id of room.participants()) hub.sendToPlayer(id, msg);
      }),
      bus.on('draw.offered', ({ room, by }) => {
        for (const seat of room.opponentsOf(by)) {
          const p = room.players[seat];
          if (p) hub.sendToPlayer(p.id, encode(S2C.NOTICE, { roomId: room.id, code: 'draw_offered' }));
        }
      }),
    ];

    let scheduled = false;
    offs.push(
      bus.on('lobby.changed', () => {
        if (scheduled) return;
        scheduled = true;
        setTimeout(async () => {
          scheduled = false;
          const rooms = await services.rooms.list();
          hub.broadcast(encode(S2C.LOBBY_STATE, { rooms: rooms.filter((r) => r.status !== 'ended').map(toLobbyEntry) }));
        }, 50);
      }),
    );
    return () => offs.forEach((off) => off());
  },
};
