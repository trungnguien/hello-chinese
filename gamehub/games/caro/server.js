import manifest from './manifest.js';
import { CARO_VARIANTS, createBoard, at, place, winningLine, winningCells, cellLabel, other } from './rules.js';
import { randomMove, greedyMove } from './bots.js';
import { ruleError } from '../../shared/gameModule.js';

class CaroMatch {
  constructor({ options }) {
    this.rules = CARO_VARIANTS[options.variant];
    this.board = createBoard(this.rules.size);
    this.turn = 'x';
    this.moves = [];
    this.result = null;
    this.winLine = null;
  }

  activeSeats() {
    return this.result ? [] : [this.turn];
  }

  act(seat, action) {
    const { row, col } = action ?? {};
    if (this.result) throw ruleError('game_over');
    if (seat !== this.turn) throw ruleError('not_your_turn');
    if (!Number.isInteger(row) || !Number.isInteger(col) || at(this.board, row, col) !== null) {
      throw ruleError('illegal_action', 'Ô không hợp lệ hoặc đã có quân');
    }
    place(this.board, row, col, seat);
    this.moves.push({ row, col, seat });
    const line = winningLine(this.board, row, col, seat, this.rules);
    const notes = [];
    if (line) {
      this.winLine = line;
      this.result = { winners: [seat], reason: 'line_complete' };
    } else if (this.board.filled === this.board.cells.length) {
      this.result = { winners: [], reason: 'board_full' };
    } else {
      this.turn = other(seat);
      if (winningCells(this.board, seat, this.rules).length) notes.push({ kind: 'threat' });
    }
    return { text: cellLabel(row, col, this.rules.size), notes };
  }

  outcome() {
    return this.result;
  }

  view() {
    const { size } = this.board;
    const rows = [];
    for (let r = 0; r < size; r++) {
      let row = '';
      for (let c = 0; c < size; c++) row += at(this.board, r, c) ?? '.';
      rows.push(row);
    }
    const last = this.moves.at(-1);
    return {
      size,
      winLength: this.rules.winLength,
      rows,
      turn: this.turn,
      lastMove: last ? { row: last.row, col: last.col } : null,
      winLine: this.winLine,
    };
  }

  legalActions(seat) {
    if (this.result || seat !== this.turn) return [];
    const out = [];
    for (let r = 0; r < this.board.size; r++) {
      for (let c = 0; c < this.board.size; c++) if (at(this.board, r, c) === null) out.push({ row: r, col: c });
    }
    return out;
  }

  chatFacts(seat) {
    return {
      assessment: () => {
        const mine = winningCells(this.board, seat, this.rules).length;
        const theirs = winningCells(this.board, other(seat), this.rules).length;
        if (!mine && !theirs) return `Chưa ai có nước thắng ngay, còn ${this.board.cells.length - this.board.filled} ô trống.`;
        return `Bạn có ${mine} ô thắng ngay, đối thủ có ${theirs}.`;
      },
      hint: () => {
        if (this.result || this.turn !== seat) return undefined;
        const { row, col } = greedyMove(this, seat);
        return cellLabel(row, col, this.board.size);
      },
    };
  }
}

export default {
  manifest,
  createMatch: ({ options }) => new CaroMatch({ options }),
  bots: {
    random: (match) => randomMove(match),
    greedy: (match, seat) => greedyMove(match, seat),
  },
};
