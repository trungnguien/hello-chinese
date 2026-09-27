import { encode, S2C } from '../../shared/protocol/contract.js';
import { toGameState, toLobbyEntry } from '../app/snapshot.js';

/**
 * Nghe sự kiện nghiệp vụ -> đẩy message theo contract tới client.
 * GameService không biết plugin này tồn tại (nguyên tắc 4).
 */
export default {
  name: 'notifier',
  setup({ bus, hub, services }) {
    const offs = [
      bus.on('game.updated', ({ session }) => {
        for (const id of session.participants()) hub.sendToPlayer(id, encode(S2C.GAME_STATE, toGameState(session, id)));
      }),
      bus.on('chat.posted', ({ session, from, text, at }) => {
        const msg = encode(S2C.CHAT_MESSAGE, { gameId: session.id, from, text, at });
        for (const id of session.participants()) hub.sendToPlayer(id, msg);
      }),
      bus.on('draw.offered', ({ session, by }) => {
        const opponent = session.players[by === 'w' ? 'b' : 'w'];
        if (opponent) hub.sendToPlayer(opponent.id, encode(S2C.NOTICE, { gameId: session.id, code: 'draw_offered' }));
      }),
    ];

    let scheduled = false;
    offs.push(
      bus.on('lobby.changed', () => {
        if (scheduled) return;
        scheduled = true;
        setTimeout(async () => {
          scheduled = false;
          const sessions = await services.games.list();
          hub.broadcast(encode(S2C.LOBBY_STATE, { games: sessions.filter((s) => s.status !== 'ended').map(toLobbyEntry) }));
        }, 50);
      }),
    );
    return () => offs.forEach((off) => off());
  },
};
