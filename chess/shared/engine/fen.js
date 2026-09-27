import { Position } from './Position.js';
import { SIZE, square, toAlgebraic, fromAlgebraic } from './geometry.js';

const pieceCache = new Map();
/** Dùng chung object quân cờ để tiết kiệm bộ nhớ (quân cờ bất biến). */
export function makePiece(color, type) {
  const key = color + type;
  if (!pieceCache.has(key)) pieceCache.set(key, Object.freeze({ color, type }));
  return pieceCache.get(key);
}

export function pieceToChar(piece) {
  return piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
}

export function charToPiece(ch) {
  const lower = ch.toLowerCase();
  return makePiece(ch === lower ? 'b' : 'w', lower);
}

export function parseFen(fen) {
  const parts = fen.trim().split(/\s+/);
  const [placement, turn = 'w', castling = '-', ep = '-', halfmove = '0', fullmove = '1'] = parts;
  const rows = placement.split('/');
  if (rows.length !== SIZE) throw new Error(`Invalid FEN placement: ${placement}`);
  const pos = new Position({});
  rows.forEach((row, i) => {
    const rank = SIZE - 1 - i;
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += Number(ch);
      } else {
        if (file >= SIZE) throw new Error(`Invalid FEN row: ${row}`);
        pos.set(square(file, rank), charToPiece(ch));
        file += 1;
      }
    }
    if (file !== SIZE) throw new Error(`Invalid FEN row: ${row}`);
  });
  if (turn !== 'w' && turn !== 'b') throw new Error(`Invalid FEN turn: ${turn}`);
  pos.turn = turn;
  pos.castling = new Set(castling === '-' ? [] : castling.split(''));
  pos.ep = ep === '-' ? null : fromAlgebraic(ep);
  pos.halfmove = Number(halfmove);
  pos.fullmove = Number(fullmove);
  return pos;
}

export function placementToFen(pos) {
  const rows = [];
  for (let rank = SIZE - 1; rank >= 0; rank--) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < SIZE; file++) {
      const piece = pos.get(square(file, rank));
      if (!piece) {
        empty++;
        continue;
      }
      if (empty) row += empty;
      empty = 0;
      row += pieceToChar(piece);
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/');
}

const CASTLING_ORDER = 'KQkq';
export function castlingToFen(castling) {
  const s = [...castling].sort((a, b) => CASTLING_ORDER.indexOf(a) - CASTLING_ORDER.indexOf(b)).join('');
  return s || '-';
}

export function toFen(pos) {
  return [
    placementToFen(pos),
    pos.turn,
    castlingToFen(pos.castling),
    pos.ep === null ? '-' : toAlgebraic(pos.ep),
    pos.halfmove,
    pos.fullmove,
  ].join(' ');
}
