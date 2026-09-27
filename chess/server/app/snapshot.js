import { toUci } from '../../shared/engine/index.js';

/**
 * Ánh xạ trạng thái nội bộ -> DTO theo contract GAME_STATE (nguyên tắc 5).
 * Cấu trúc bên trong GameSession/Game có thể đổi thoải mái; chỉ file này phải theo.
 */
const publicPlayer = (p) => (p ? { id: p.id, name: p.name, isBot: Boolean(p.isBot) } : null);

export function toGameState(session, viewerId, now = Date.now()) {
  const { game } = session;
  const you = session.colorOf(viewerId);
  const last = game.lastMove;
  const yourTurn = session.status === 'active' && you === game.turn;
  const clock = session.clock.snapshot();
  return {
    id: session.id,
    status: session.status,
    variant: session.variant.describe(),
    timeControl: { id: session.timeControl.id, label: session.timeControl.label },
    players: { w: publicPlayer(session.players.w), b: publicPlayer(session.players.b) },
    you,
    fen: game.fen(),
    turn: game.turn,
    check: game.inCheck(),
    lastMove: last ? { from: last.from, to: last.to } : null,
    moves: game.history.map((h) => ({ san: h.san, uci: h.uci, color: h.color })),
    legalMoves: yourTurn ? game.legalMoves().map(toUci) : [],
    clock: clock ? { ...clock, serverNow: now } : null,
    drawOffer: session.drawOffer,
    result: game.result,
    spectators: session.spectators.size,
  };
}

export function toLobbyEntry(session) {
  return {
    id: session.id,
    status: session.status,
    variant: session.variant.describe(),
    timeControl: { id: session.timeControl.id, label: session.timeControl.label },
    players: { w: publicPlayer(session.players.w), b: publicPlayer(session.players.b) },
    moves: session.game.history.length,
    createdAt: session.createdAt,
  };
}
