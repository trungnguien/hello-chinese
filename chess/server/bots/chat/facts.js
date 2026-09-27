import { toUci } from '../../../shared/engine/index.js';
import { toSan } from '../../../shared/engine/san.js';
import { botStrategies } from '../strategies.js';

const COLOR_NAME = { w: 'Trắng', b: 'Đen' };

/**
 * Các "fact" dùng để điền vào mẫu câu. Tính LƯỜI (chỉ khi mẫu cần) và
 * trả về undefined khi không áp dụng được — brain sẽ bỏ qua câu đó.
 * Mọi thông tin lấy qua API công khai của session/game và DỮ LIỆU quân cờ.
 */
export function createFacts({ session, bot, extra = {} }) {
  const botColor = session.colorOf(bot.id);
  const humanColor = botColor === 'w' ? 'b' : 'w';
  const { game } = session;
  const engine = game.engine;

  const material = (color) =>
    [...game.position.pieces(color)].reduce((sum, [, p]) => sum + (engine.pieceDef(p.type).value ?? 0), 0);

  return {
    bot: () => bot.name,
    opponent: () => session.players[humanColor]?.name,
    moves: () => game.history.filter((h) => h.color === botColor).length,
    lastMove: () => game.lastMove?.san,
    piece: () => (extra.pieceType ? engine.pieceDef(extra.pieceType).name?.toLowerCase() : undefined),
    assessment: () => {
      const diff = material('w') - material('b');
      if (diff === 0) return 'Vật chất đang cân bằng.';
      return `${COLOR_NAME[diff > 0 ? 'w' : 'b']} đang hơn ${Math.abs(diff)} điểm quân.`;
    },
    /** Gợi ý nước cho người chơi — chỉ khi tới lượt họ và ván còn diễn ra. */
    hint: () => {
      if (session.status !== 'active' || game.turn !== humanColor) return undefined;
      const uci = botStrategies.get('greedy')(game);
      const legal = game.legalMoves();
      const move = legal.find((m) => toUci(m) === uci);
      return move ? toSan(engine, game.position, move, legal) : undefined;
    },
    ...extra.facts,
  };
}
