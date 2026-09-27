import { C2S, S2C, PROTOCOL_VERSION } from '../../shared/protocol/contract.js';
import { toGameState, toLobbyEntry } from '../app/snapshot.js';

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
    const sessions = await services.games.list();
    send(S2C.LOBBY_STATE, { games: sessions.filter((s) => s.status !== 'ended').map(toLobbyEntry) });
    // Kết nối lại: gửi lại các ván đang dang dở của người chơi.
    for (const session of sessions) {
      if (session.status !== 'ended' && session.colorOf(player.id)) send(S2C.GAME_STATE, toGameState(session, player.id));
    }
    return { playerId: player.id };
  },
};

export const lobbyList = {
  type: C2S.LOBBY_LIST,
  async handle({ services, send }) {
    const sessions = await services.games.list();
    send(S2C.LOBBY_STATE, { games: sessions.filter((s) => s.status !== 'ended').map(toLobbyEntry) });
  },
};
