import { BoardView } from './BoardView.js';
import { pieceSets } from './pieceSets.js';

/**
 * Client của module Cờ vua — thoả contract mount(element, api) -> { update, unmount }.
 * Nền tảng lo khung phòng (người chơi, đồng hồ, chat, nút); module chỉ vẽ bàn cờ.
 */
export function mount(element, api) {
  const board = new BoardView({ pieceSet: pieceSets.unicode, onMove: (uci) => api.sendAction({ uci }) });
  element.append(board.el);
  return {
    update(view, ctx) {
      const base = ctx.you ?? 'w';
      const orientation = ctx.flipped ? (base === 'w' ? 'b' : 'w') : base;
      board.render({
        fen: view.fen,
        orientation,
        lastMove: view.lastMove,
        check: view.check,
        turn: view.turn,
        legalMoves: ctx.status === 'active' ? view.legalMoves : [],
      });
    },
    unmount() {
      board.el.remove();
    },
  };
}
