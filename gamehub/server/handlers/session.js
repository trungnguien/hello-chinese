import { C2S, S2C, PROTOCOL_VERSION } from '../../shared/protocol/contract.js';
import { toRoomState, toLobbyEntry } from '../app/snapshot.js';

const openRooms = (rooms) => rooms.filter((r) => r.status !== 'ended').map(toLobbyEntry);

export const hello = {
  type: C2S.HELLO,
  requiresIdentity: false,
  async handle({ payload, connection, services, hub, send }) {
    const player = services.players.identify(payload);
    hub.bind(connection, player);
    send(S2C.WELCOME, {
      protocol: PROTOCOL_VERSION,
      player: { id: player.id, name: player.name, token: player.token },
      catalog: services.catalog(),
    });
    const rooms = await services.rooms.list();
    send(S2C.LOBBY_STATE, { rooms: openRooms(rooms) });
    // Kết nối lại: gửi lại các phòng đang dang dở của người chơi.
    for (const room of rooms) {
      if (room.status !== 'ended' && room.seatOf(player.id)) send(S2C.ROOM_STATE, toRoomState(room, player.id));
    }
    return { playerId: player.id };
  },
};

export const lobbyList = {
  type: C2S.LOBBY_LIST,
  async handle({ services, send }) {
    send(S2C.LOBBY_STATE, { rooms: openRooms(await services.rooms.list()) });
  },
};
