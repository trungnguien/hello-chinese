import { EventBus } from '../core/EventBus.js';
import { parseFen, toFen, placementToFen, castlingToFen } from './fen.js';
import { toAlgebraic } from './geometry.js';
import { toUci } from './move.js';
import { toSan } from './san.js';
import { Engine } from './Engine.js';

export class GameError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.code = code;
  }
}

export const SCORE = { w: '1-0', b: '0-1', draw: '1/2-1/2' };

/**
 * Một ván cờ: nhận nước đi, kiểm tra hợp lệ, ghi lịch sử, đánh giá kết thúc.
 * Game KHÔNG gọi UI, mạng hay lưu trữ — nó chỉ công bố sự kiện (nguyên tắc 4):
 *   'moved' { game, record }   'ended' { game, result }
 */
export class Game {
  constructor({ variant, fen, events = new EventBus() }) {
    this.variant = variant;
    this.engine = new Engine(variant);
    this.startFen = fen ?? variant.initialFen;
    this.position = parseFen(this.startFen);
    this.events = events;
    this.history = [];
    this.result = null;
    this._legal = null;
    this._repetitions = new Map();
    this._countRepetition();
  }

  get turn() {
    return this.position.turn;
  }

  get isOver() {
    return this.result !== null;
  }

  get lastMove() {
    return this.history.at(-1) ?? null;
  }

  fen() {
    return toFen(this.position);
  }

  legalMoves() {
    this._legal ??= this.engine.legalMoves(this.position);
    return this._legal;
  }

  inCheck() {
    return this.engine.inCheck(this.position, this.turn);
  }

  /** @param {string} uci ví dụ "e2e4", "e7e8q" */
  play(uci) {
    if (this.isOver) throw new GameError('game_over', 'Ván cờ đã kết thúc');
    const legal = this.legalMoves();
    const move = legal.find((m) => toUci(m) === uci);
    if (!move) throw new GameError('illegal_move', `Nước đi không hợp lệ: ${uci}`);

    const san = toSan(this.engine, this.position, move, legal);
    const color = this.turn;
    this.position = this.engine.apply(this.position, move);
    this._legal = null;
    const record = {
      ply: this.history.length + 1,
      color,
      uci,
      san,
      from: toAlgebraic(move.from),
      to: toAlgebraic(move.to),
      captured: move.captured?.type ?? null,
      check: this.inCheck(),
      fen: this.fen(),
    };
    this.history.push(record);
    const repetitions = this._countRepetition();
    this.events.emit('moved', { game: this, record });

    const ctx = {
      position: this.position,
      engine: this.engine,
      legalMoves: this.legalMoves(),
      history: this.history,
      lastMove: record,
      repetitions,
    };
    for (const evaluate of this.variant.endConditions) {
      const outcome = evaluate(ctx);
      if (outcome) {
        this.end(outcome);
        break;
      }
    }
    return record;
  }

  /** Kết thúc từ bên ngoài luật (đầu hàng, hết giờ, thoả thuận hoà...). */
  end({ winner = null, reason }) {
    if (this.isOver) return this.result;
    this.result = { winner, reason, score: winner ? SCORE[winner] : SCORE.draw };
    this.events.emit('ended', { game: this, result: this.result });
    return this.result;
  }

  _countRepetition() {
    const hasEp = this.legalMoves().some((m) => m.flags.enPassant);
    const key = [
      placementToFen(this.position),
      this.position.turn,
      castlingToFen(this.position.castling),
      hasEp ? this.position.ep : '-',
    ].join(' ');
    const n = (this._repetitions.get(key) ?? 0) + 1;
    this._repetitions.set(key, n);
    return n;
  }
}
