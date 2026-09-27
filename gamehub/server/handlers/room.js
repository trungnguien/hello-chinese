import { C2S, ERRORS } from '../../shared/protocol/contract.js';
import { ServiceError } from '../app/errors.js';

/** Mỗi handler chỉ dịch payload -> lời gọi use case. Không chứa luật chơi. */
export const create = {
  type: C2S.ROOM_CREATE,
  async handle({ payload, player, services, registries }) {
    const opponent = payload.opponent ? registries.opponents.find(payload.opponent) : null;
    if (payload.opponent && !opponent?.supports(payload.game)) {
      throw new ServiceError(ERRORS.INVALID_PAYLOAD, `Opponent "${payload.opponent}" không chơi được "${payload.game}"`);
    }
    const room = await services.rooms.create({
      player,
      gameId: payload.game,
      options: payload.options,
      timeControlId: payload.timeControl,
      seat: payload.seat,
    });
    if (opponent) await opponent.join(room.id);
    return { roomId: room.id, game: room.gameId };
  },
};

const roomCall = (type, method, extra = () => ({})) => ({
  type,
  async handle({ payload, player, services }) {
    await services.rooms[method]({ player, roomId: payload.roomId, ...extra(payload) });
    return { roomId: payload.roomId };
  },
});

export const join = roomCall(C2S.ROOM_JOIN, 'join');
export const watch = roomCall(C2S.ROOM_WATCH, 'watch');
export const leave = roomCall(C2S.ROOM_LEAVE, 'leave');
export const act = roomCall(C2S.ROOM_ACTION, 'act', (p) => ({ action: p.action }));
export const resign = roomCall(C2S.ROOM_RESIGN, 'resign');
export const offerDraw = roomCall(C2S.ROOM_OFFER_DRAW, 'offerDraw');
export const respondDraw = roomCall(C2S.ROOM_RESPOND_DRAW, 'respondDraw', (p) => ({ accept: p.accept }));
export const chat = roomCall(C2S.CHAT_SEND, 'chat', (p) => ({ text: p.text }));
