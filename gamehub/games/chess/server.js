import manifest from './manifest.js';
import { Game, GameError, buildVariant, variantDefinitions, toUci, toPgn, SCORE } from './engine/index.js';
import { toSan } from './engine/san.js';
import { chessStrategies } from './bots.js';
import { ruleError } from '../../shared/gameModule.js';

/**
 * ADAPTER: bọc engine cờ vua có sẵn vào GameModule contract.
 * Engine không đổi một dòng — đây là lớp dịch giữa hai contract.
 */
const variants = new Map();
const variantOf = (id) => {
  if (!variants.has(id)) variants.set(id, buildVariant(variantDefinitions.get(id)));
  return variants.get(id);
};
const COLOR = { w: 'Trắng', b: 'Đen' };

class ChessMatch {
  constructor({ options }) {
    this.game = new Game({ variant: variantOf(options.variant) });
  }

  activeSeats() {
    return this.game.isOver ? [] : [this.game.turn];
  }

  act(seat, action) {
    if (typeof action?.uci !== 'string') throw ruleError('illegal_action', 'Cần trường "uci"');
    if (seat !== this.game.turn) throw ruleError('not_your_turn');
    let record;
    try {
      record = this.game.play(action.uci);
    } catch (err) {
      if (err instanceof GameError) throw ruleError(err.code, err.message);
      throw err;
    }
    const notes = [];
    if (record.check) notes.push({ kind: 'check' });
    if (record.captured) notes.push({ kind: 'capture', label: this.game.engine.pieceDef(record.captured).name.toLowerCase() });
    return { text: record.san, notes };
  }

  outcome() {
    const r = this.game.result;
    return r ? { winners: r.winner ? [r.winner] : [], reason: r.reason } : null;
  }

  view(seat) {
    const { game } = this;
    const last = game.lastMove;
    const yourTurn = !game.isOver && seat === game.turn;
    return {
      fen: game.fen(),
      turn: game.turn,
      check: game.inCheck(),
      lastMove: last ? { from: last.from, to: last.to } : null,
      legalMoves: yourTurn ? game.legalMoves().map(toUci) : [],
    };
  }

  legalActions(seat) {
    return seat === this.game.turn && !this.game.isOver ? this.game.legalMoves().map((m) => ({ uci: toUci(m) })) : [];
  }

  /** Hết giờ: nếu đối thủ chỉ còn quân "royal" thì không thể chiếu hết -> hoà. */
  timeoutOutcome(flaggedSeat) {
    const opponent = flaggedSeat === 'w' ? 'b' : 'w';
    const engine = this.game.engine;
    const canMate = [...this.game.position.pieces(opponent)].some(([, p]) => !engine.pieceDef(p.type).royal);
    return canMate ? { winners: [opponent], reason: 'timeout' } : { winners: [], reason: 'timeout_insufficient' };
  }

  chatFacts(seat) {
    const { game } = this;
    const engine = game.engine;
    const material = (color) =>
      [...game.position.pieces(color)].reduce((sum, [, p]) => sum + (engine.pieceDef(p.type).value ?? 0), 0);
    return {
      assessment: () => {
        const diff = material('w') - material('b');
        if (diff === 0) return 'Vật chất đang cân bằng.';
        return `${COLOR[diff > 0 ? 'w' : 'b']} đang hơn ${Math.abs(diff)} điểm quân.`;
      },
      /** Gợi ý nước cho ghế `seat` — chỉ khi tới lượt ghế đó. */
      hint: () => {
        if (game.isOver || game.turn !== seat) return undefined;
        const uci = chessStrategies.greedy(game);
        const legal = game.legalMoves();
        const move = legal.find((m) => toUci(m) === uci);
        return move ? toSan(engine, game.position, move, legal) : undefined;
      },
    };
  }
}

export default {
  manifest,
  createMatch: ({ options }) => new ChessMatch({ options }),
  bots: {
    random: (match) => ({ uci: chessStrategies.random(match.game) }),
    greedy: (match) => ({ uci: chessStrategies.greedy(match.game) }),
  },
  exporters: {
    /** record: { room, names: { seat: name } } */
    pgn: ({ room, names }) => {
      const { game } = room.match;
      const r = room.result;
      const score = !r ? '*' : r.winners.length === 1 ? SCORE[r.winners[0]] : SCORE.draw;
      const date = new Date(room.createdAt);
      return {
        extension: 'pgn',
        content: toPgn({
          tags: {
            Event: `Online ${game.variant.name}`,
            Site: 'gamehub',
            Date: date.toISOString().slice(0, 10).replace(/-/g, '.'),
            White: names.w ?? '?',
            Black: names.b ?? '?',
            Result: score,
            Variant: game.variant.id,
            TimeControl: room.timeControl?.label ?? '-',
            Termination: room.result?.reason ?? '',
          },
          moves: game.history.map((h) => h.san),
          result: score,
        }),
      };
    },
  },
};
