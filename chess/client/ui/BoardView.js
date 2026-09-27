import { h, clear } from './dom.js';
import { renderPiece } from './pieceSets.js';

const FILES = 'abcdefghijklmnop';

/** Đọc phần xếp quân của FEN — kích thước bàn suy ra từ dữ liệu, không viết cứng 8x8. */
export function parsePlacement(fen) {
  const rows = fen.split(' ')[0].split('/');
  const pieces = new Map();
  let width = 0;
  rows.forEach((row, i) => {
    const rank = rows.length - i;
    let file = 0;
    for (const token of row.match(/\d+|./g)) {
      if (/\d/.test(token)) {
        file += Number(token);
      } else {
        pieces.set(FILES[file] + rank, { color: token === token.toUpperCase() ? 'w' : 'b', type: token.toLowerCase() });
        file += 1;
      }
    }
    width = Math.max(width, file);
  });
  return { pieces, width, height: rows.length };
}

/**
 * Bàn cờ tương tác. Không biết gì về mạng hay luật cờ:
 *  - vẽ theo props (fen, legalMoves dạng UCI do server cung cấp),
 *  - khi người dùng muốn đi, phát 'intent.move' { uci } lên bus (nguyên tắc 4).
 */
export class BoardView {
  constructor({ bus, pieceSet }) {
    this.bus = bus;
    this.pieceSet = pieceSet;
    this.el = h('div', { class: 'board', role: 'grid', 'aria-label': 'Bàn cờ' });
    this.props = null;
    this.selected = null;
    this.drag = null;
    this.promotion = null;
    this.el.addEventListener('pointerdown', (e) => this.#onPointerDown(e));
    this.el.addEventListener('pointermove', (e) => this.#onPointerMove(e));
    this.el.addEventListener('pointerup', (e) => this.#onPointerUp(e));
    this.el.addEventListener('pointercancel', () => this.#endDrag());
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * @param {{ fen: string, orientation: 'w'|'b', lastMove?: {from,to}, check?: boolean,
   *           turn: 'w'|'b', legalMoves: string[] }} props
   */
  render(props) {
    const positionChanged = this.props?.fen !== props.fen;
    this.props = props;
    if (positionChanged) this.promotion = null;
    if (this.selected && !this.#movable(this.selected)) this.selected = null;
    this.#draw();
  }

  #movable(sq) {
    return this.props.legalMoves.some((u) => u.startsWith(sq));
  }

  #targets(from) {
    return new Set(this.props.legalMoves.filter((u) => u.startsWith(from)).map((u) => u.slice(2, 4)));
  }

  #draw() {
    const { fen, orientation, lastMove, check, turn } = this.props;
    const { pieces, width, height } = parsePlacement(fen);
    const targets = this.selected ? this.#targets(this.selected) : new Set();
    let checkSquare = null;
    if (check) {
      for (const [sq, p] of pieces) if (p.type === 'k' && p.color === turn) checkSquare = sq;
    }

    clear(this.el);
    this.el.style.setProperty('--files', width);
    this.el.style.setProperty('--ranks', height);
    const ranks = [...Array(height).keys()].map((i) => height - i);
    const files = [...Array(width).keys()];
    if (orientation === 'b') {
      ranks.reverse();
      files.reverse();
    }
    ranks.forEach((rank, row) => {
      files.forEach((file, col) => {
        const sq = FILES[file] + rank;
        const piece = pieces.get(sq);
        const classes = ['square', (file + rank) % 2 === 1 ? 'light' : 'dark'];
        if (lastMove && (lastMove.from === sq || lastMove.to === sq)) classes.push('last');
        if (sq === this.selected) classes.push('selected');
        if (sq === checkSquare) classes.push('check');
        if (targets.has(sq)) classes.push(piece ? 'target capture' : 'target');
        if (this.#movable(sq)) classes.push('movable');
        this.el.append(
          h(
            'div',
            { class: classes.join(' '), dataset: { square: sq }, role: 'gridcell', 'aria-label': sq },
            piece && h('span', { class: `piece ${piece.color}`, dataset: { type: piece.type } }, renderPiece(this.pieceSet, piece)),
            col === 0 && h('span', { class: 'coord rank' }, rank),
            row === height - 1 && h('span', { class: 'coord file' }, FILES[file]),
          ),
        );
      });
    });
    if (this.promotion) this.el.append(this.#promotionPicker());
  }

  #promotionPicker() {
    const { choices, color } = this.promotion;
    return h(
      'div',
      { class: 'promotion', onpointerdown: (e) => e.stopPropagation(), onpointerup: (e) => e.stopPropagation() },
      h('div', { class: 'promotion-title' }, 'Phong cấp thành'),
      h(
        'div',
        { class: 'promotion-choices' },
        choices.map((uci) =>
          h(
            'button',
            { class: `promotion-choice piece ${color}`, onclick: () => this.#emitMove(uci) },
            renderPiece(this.pieceSet, { color, type: uci[4] }),
          ),
        ),
      ),
      h('button', { class: 'link', onclick: () => ((this.promotion = null), this.#draw()) }, 'Huỷ'),
    );
  }

  #tryMove(from, to) {
    const candidates = this.props.legalMoves.filter((u) => u.startsWith(from + to));
    if (candidates.length === 0) return false;
    if (candidates.length === 1) this.#emitMove(candidates[0]);
    else {
      const color = parsePlacement(this.props.fen).pieces.get(from)?.color ?? this.props.turn;
      this.promotion = { choices: candidates, color };
      this.selected = null;
      this.#draw();
    }
    return true;
  }

  #emitMove(uci) {
    this.selected = null;
    this.promotion = null;
    this.bus.emit('intent.move', { uci });
    this.#draw();
  }

  #onTap(sq) {
    if (this.selected && this.selected !== sq && this.#tryMove(this.selected, sq)) return;
    this.selected = this.selected !== sq && this.#movable(sq) ? sq : null;
    this.#draw();
  }

  #squareAt(x, y) {
    return document.elementFromPoint(x, y)?.closest('[data-square]')?.dataset.square ?? null;
  }

  #onPointerDown(e) {
    if (!this.props || this.promotion || e.button > 0) return;
    const sq = e.target.closest('[data-square]')?.dataset.square;
    if (!sq) return;
    const pieceEl = e.target.closest('[data-square]').querySelector('.piece');
    this.drag = { from: sq, x: e.clientX, y: e.clientY, moved: false, pieceEl, ghost: null };
    if (this.#movable(sq)) this.el.setPointerCapture(e.pointerId);
  }

  #onPointerMove(e) {
    const d = this.drag;
    if (!d || !this.#movable(d.from)) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return;
    if (!d.moved) {
      d.moved = true;
      this.selected = d.from;
      this.#draw();
      const origin = this.el.querySelector(`[data-square="${d.from}"] .piece`);
      origin?.classList.add('dragging');
      d.ghost = h('span', { class: `${origin?.className ?? 'piece'} ghost` }, origin?.textContent ?? '');
      d.ghost.style.fontSize = getComputedStyle(origin ?? this.el).fontSize;
      document.body.append(d.ghost);
    }
    d.ghost.style.left = `${e.clientX}px`;
    d.ghost.style.top = `${e.clientY}px`;
  }

  #onPointerUp(e) {
    const d = this.drag;
    if (!d) return;
    const target = this.#squareAt(e.clientX, e.clientY);
    this.#endDrag();
    if (!d.moved) return target && this.#onTap(target);
    if (!target || target === d.from || !this.#tryMove(d.from, target)) this.#draw();
  }

  #endDrag() {
    this.drag?.ghost?.remove();
    this.drag = null;
  }
}
