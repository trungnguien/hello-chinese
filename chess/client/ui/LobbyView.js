import { h, clear } from './dom.js';

/**
 * Sảnh chờ. Mọi lựa chọn (biến thể, thời gian, đối thủ) được dựng từ `catalog`
 * do server gửi — thêm biến thể/bot ở server là UI tự có, không sửa client (nguyên tắc 3).
 * View chỉ phát intent lên bus (nguyên tắc 4).
 */
export class LobbyView {
  constructor({ bus }) {
    this.bus = bus;
    this.el = h('section', { class: 'lobby' });
    this.nameInput = h('input', { type: 'text', maxlength: 24, placeholder: 'Tên của bạn', autocomplete: 'nickname' });
    this.selects = {
      opponent: h('select', { name: 'opponent' }),
      variant: h('select', { name: 'variant' }),
      timeControl: h('select', { name: 'timeControl' }),
      color: h('select', { name: 'color' }),
    };
    this.variantHint = h('p', { class: 'hint' });
    this.selects.variant.addEventListener('change', () => this.#updateHint());
    this.list = h('div', { class: 'game-list' });
    this.catalogKey = null;
    this.#build();
  }

  #build() {
    const form = h(
      'form',
      {
        class: 'card create',
        onsubmit: (e) => {
          e.preventDefault();
          const v = Object.fromEntries(Object.entries(this.selects).map(([k, el]) => [k, el.value]));
          this.bus.emit('intent.create', {
            variant: v.variant,
            timeControl: v.timeControl,
            color: v.color,
            opponent: v.opponent || undefined,
          });
        },
      },
      h('h2', {}, 'Tạo ván mới'),
      field('Đối thủ', this.selects.opponent),
      field('Biến thể', this.selects.variant),
      this.variantHint,
      field('Thời gian', this.selects.timeControl),
      field('Cầm quân', this.selects.color),
      h('button', { type: 'submit', class: 'primary' }, 'Tạo ván'),
    );
    const identity = h(
      'form',
      {
        class: 'card identity',
        onsubmit: (e) => {
          e.preventDefault();
          this.bus.emit('intent.rename', { name: this.nameInput.value });
        },
      },
      h('h2', {}, 'Người chơi'),
      h('div', { class: 'row' }, this.nameInput, h('button', { type: 'submit' }, 'Lưu tên')),
    );
    this.el.append(
      h('div', { class: 'lobby-side' }, identity, form),
      h('div', { class: 'card games' }, h('h2', {}, 'Phòng đang mở'), this.list),
    );
  }

  render(state) {
    if (state.me && document.activeElement !== this.nameInput) this.nameInput.value = state.me.name;
    const key = JSON.stringify(state.catalog);
    if (key !== this.catalogKey) {
      this.catalogKey = key;
      const { catalog } = state;
      fill(this.selects.opponent, [
        { id: '', name: 'Người chơi khác (online)' },
        ...catalog.opponents.map((o) => ({ id: o.id, name: o.name })),
      ]);
      fill(this.selects.variant, catalog.variants.map((v) => ({ id: v.id, name: v.name })));
      fill(this.selects.timeControl, catalog.timeControls.map((t) => ({ id: t.id, name: t.label })));
      fill(this.selects.color, [
        { id: 'random', name: 'Ngẫu nhiên' },
        { id: 'w', name: 'Trắng' },
        { id: 'b', name: 'Đen' },
      ]);
      this.catalog = catalog;
      this.#updateHint();
    }
    this.#renderList(state);
  }

  #updateHint() {
    const v = this.catalog?.variants.find((x) => x.id === this.selects.variant.value);
    this.variantHint.textContent = v?.description ?? '';
  }

  #renderList(state) {
    clear(this.list);
    const games = [...state.lobby].sort((a, b) => (a.status === b.status ? b.createdAt - a.createdAt : a.status === 'waiting' ? -1 : 1));
    if (!games.length) {
      this.list.append(h('p', { class: 'empty' }, 'Chưa có phòng nào. Hãy tạo một ván!'));
      return;
    }
    for (const g of games) {
      const mine = [g.players.w?.id, g.players.b?.id].includes(state.me?.id);
      const names = `${g.players.w?.name ?? '—'} vs ${g.players.b?.name ?? '—'}`;
      let action;
      if (mine) action = h('button', { onclick: () => this.bus.emit('intent.open', { gameId: g.id }) }, 'Mở');
      else if (g.status === 'waiting') action = h('button', { class: 'primary', onclick: () => this.bus.emit('intent.join', { gameId: g.id }) }, 'Vào chơi');
      else action = h('button', { onclick: () => this.bus.emit('intent.open', { gameId: g.id }) }, 'Xem');
      this.list.append(
        h(
          'div',
          { class: `game-row ${g.status}` },
          h(
            'div',
            { class: 'game-info' },
            h('strong', {}, names),
            h('span', { class: 'meta' }, `${g.variant.name} · ${g.timeControl.label} · ${g.status === 'waiting' ? 'đang chờ' : `${g.moves} nước`}`),
          ),
          action,
        ),
      );
    }
  }
}

function field(label, control) {
  return h('label', { class: 'field' }, h('span', {}, label), control);
}

function fill(select, options) {
  const current = select.value;
  clear(select);
  for (const o of options) select.append(h('option', { value: o.id }, o.name));
  if (options.some((o) => o.id === current)) select.value = current;
}
