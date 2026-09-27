import { h } from '/shared/dom.js';

/**
 * Client của module Caro — vẽ lưới N×N từ `view`, bấm ô trống để đặt quân.
 * Kích thước bàn đến từ dữ liệu (15×15, 3×3...) nên một client dùng cho mọi biến thể.
 */
export function mount(element, api) {
  const grid = h('div', { class: 'caro-board', role: 'grid', 'aria-label': 'Bàn cờ caro' });
  element.append(grid);
  let clickable = false;

  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.caro-cell');
    if (!cell || !clickable || cell.dataset.stone) return;
    api.sendAction({ row: Number(cell.dataset.row), col: Number(cell.dataset.col) });
  });

  return {
    update(view, ctx) {
      clickable = ctx.status === 'active' && ctx.active;
      const win = new Set((view.winLine ?? []).map(([r, c]) => `${r}:${c}`));
      grid.style.setProperty('--n', view.size);
      grid.classList.toggle('small', view.size <= 5);
      grid.classList.toggle('clickable', clickable);
      grid.dataset.preview = ctx.you ?? '';
      grid.replaceChildren(
        ...view.rows.flatMap((row, r) =>
          [...row].map((ch, c) => {
            const stone = ch === '.' ? '' : ch;
            const classes = ['caro-cell'];
            if (view.lastMove?.row === r && view.lastMove?.col === c) classes.push('last');
            if (win.has(`${r}:${c}`)) classes.push('win');
            return h(
              'button',
              {
                class: classes.join(' '),
                dataset: { row: r, col: c, stone },
                'aria-label': `${String.fromCharCode(65 + c)}${view.size - r}${stone ? ' ' + stone.toUpperCase() : ''}`,
                tabindex: clickable && !stone ? 0 : -1,
              },
              stone ? h('span', { class: `stone ${stone}` }, stone === 'x' ? '✕' : '◯') : null,
            );
          }),
        ),
      );
    },
    unmount() {
      grid.remove();
    },
  };
}
