import { C2S, ERRORS } from '../../shared/protocol/contract.js';
import { ServiceError } from '../app/errors.js';

/** Mỗi handler chỉ dịch payload -> lời gọi use case. Không chứa luật chơi. */
export const create = {
  type: C2S.GAME_CREATE,
  async handle({ payload, player, services, registries }) {
    const opponent = payload.opponent ? registries.opponents.find(payload.opponent) : null;
    if (payload.opponent && !opponent) throw new ServiceError(ERRORS.INVALID_PAYLOAD, `Unknown opponent "${payload.opponent}"`);
    const session = await services.games.create({
      player,
      variantId: payload.variant,
      timeControlId: payload.timeControl,
      color: payload.color,
    });
    if (opponent) await opponent.join(session.id);
    return { gameId: session.id };
  },
};

export const join = {
  type: C2S.GAME_JOIN,
  async handle({ payload, player, services }) {
    await services.games.join({ player, gameId: payload.gameId });
    return { gameId: payload.gameId };
  },
};

export const watch = {
  type: C2S.GAME_WATCH,
  async handle({ payload, player, services }) {
    await services.games.watch({ player, gameId: payload.gameId });
    return { gameId: payload.gameId };
  },
};

export const leave = {
  type: C2S.GAME_LEAVE,
  async handle({ payload, player, services }) {
    await services.games.leave({ player, gameId: payload.gameId });
  },
};

export const move = {
  type: C2S.GAME_MOVE,
  async handle({ payload, player, services }) {
    await services.games.move({ player, gameId: payload.gameId, uci: payload.uci });
  },
};

export const resign = {
  type: C2S.GAME_RESIGN,
  async handle({ payload, player, services }) {
    await services.games.resign({ player, gameId: payload.gameId });
  },
};

export const offerDraw = {
  type: C2S.GAME_OFFER_DRAW,
  async handle({ payload, player, services }) {
    await services.games.offerDraw({ player, gameId: payload.gameId });
  },
};

export const respondDraw = {
  type: C2S.GAME_RESPOND_DRAW,
  async handle({ payload, player, services }) {
    await services.games.respondDraw({ player, gameId: payload.gameId, accept: payload.accept });
  },
};

export const chat = {
  type: C2S.CHAT_SEND,
  async handle({ payload, player, services }) {
    await services.games.chat({ player, gameId: payload.gameId, text: payload.text });
  },
};
