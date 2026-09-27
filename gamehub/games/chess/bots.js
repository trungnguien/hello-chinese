import { toUci } from './engine/index.js';

/**
 * Chiến lược chọn nước riêng của cờ vua: (game) -> uci.
 * Chỉ dùng API công khai của Game/Engine và giá trị quân lấy từ DỮ LIỆU variant.
 */
export const chessStrategies = {};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

chessStrategies.random = (game) => toUci(pick(game.legalMoves()));

/** Tham lam 1 nước: ưu tiên chiếu hết, ăn quân giá trị cao, tránh đặt quân vào ô bị bắt. */
chessStrategies.greedy = (game) => {
  const { engine, position } = game;
  const value = (type) => engine.pieceDef(type).value ?? 0;
  let best = [];
  let bestScore = -Infinity;
  for (const move of game.legalMoves()) {
    const next = engine.apply(position, move);
    let score = Math.random() * 0.1;
    if (engine.legalMoves(next).length === 0) score += engine.inCheck(next, next.turn) ? 1000 : -50;
    if (move.captured) score += value(move.captured.type) * 10;
    if (move.promotion) score += value(move.promotion) * 10;
    if (engine.isAttacked(next, move.to, next.turn)) {
      score -= value(move.promotion ?? move.piece.type) * 9;
    }
    if (engine.inCheck(next, next.turn)) score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) best.push(move);
  }
  return toUci(pick(best));
};
