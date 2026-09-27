import { h } from '/shared/dom.js';
import { renderRoomList } from './RoomList.js';

/**
 * Sảnh của MỘT game. Form tạo phòng được dựng từ manifest.options (schema dữ liệu),
 * danh sách ghế, đối thủ máy hỗ trợ game đó và thời gian (nếu game có capability clock).
 */
export class LobbyView {
  constructor({ bus }) {
    this.bus = bus;
    this.header = h('div', { class: 'lobby-head' });
    this.form = h('form', { class: 'card create', onsubmit: (e) => this.#submit(e) });
    this.rooms = h('div', { class: 'room-list' });
    this.el = h(
      'section',
      { class: 'lobby' },
      this.header,
      h('div', { class: 'lobby-grid' }, this.form, h('div', { class: 'card' }, h('h2', {}, 'Phòng đang mở'), this.rooms)),
    );
    this.formKey = null;
    this.controls = {};
  }

  render(state) {
    const game = state.catalog.games.find((g) => g.id === state.route.gameId);
    if (!game) {
      this.header.replaceChildren(h('p', {}, 'Không tìm thấy game này.'));
      return;
    }
    this.game = game;
    this.header.replaceChildren(
      h('button', { class: 'link back', onclick: () => this.bus.emit('intent.market') }, '← Chợ game'),
      h(
        'div',
        { class: 'lobby-title' },
        h('span', { class: 'game-card-icon', 'aria-hidden': 'true' }, game.icon),
        h('div', {}, h('h1', {}, game.name), h('p', { class: 'meta' }, game.description)),
      ),
    );
    const key = JSON.stringify([game, state.catalog.timeControls]);
    if (key !== this.formKey) {
      this.formKey = key;
      this.#buildForm(game, state.catalog.timeControls);
    }
    renderRoomList(this.rooms, { rooms: state.lobby.filter((r) => r.game.id === game.id), me: state.me, bus: this.bus });
  }

  #buildForm(game, timeControls) {
    const select = (name, choices, value) => {
      const el = h('select', { name }, choices.map((c) => h('option', { value: c.value }, c.label)));
      if (value !== undefined) el.value = value;
      return el;
    };
    this.controls = { options: {} };
    const fields = [];
    this.controls.opponent = select('opponent', [
      { value: '', label: 'Người chơi khác (online)' },
      ...game.opponents.map((o) => ({ value: o.id, label: o.name })),
    ]);
    fields.push(field('Đối thủ', this.controls.opponent));
    for (const opt of game.options ?? []) {
      const el = select(opt.id, opt.choices, opt.default);
      const hint = h('p', { class: 'hint' });
      const updateHint = () => (hint.textContent = opt.choices.find((c) => c.value === el.value)?.description ?? '');
      el.addEventListener('change', updateHint);
      updateHint();
      this.controls.options[opt.id] = el;
      fields.push(field(opt.label, el), hint);
    }
    if (game.capabilities?.clock) {
      this.controls.timeControl = select(
        'timeControl',
        timeControls.map((t) => ({ value: t.id, label: t.label })),
        'untimed',
      );
      fields.push(field('Thời gian', this.controls.timeControl));
    }
    this.controls.seat = select('seat', [{ value: 'random', label: 'Ngẫu nhiên' }, ...game.seats.map((s) => ({ value: s.id, label: s.label }))]);
    fields.push(field('Cầm quân', this.controls.seat));
    this.form.replaceChildren(h('h2', {}, 'Tạo phòng mới'), ...fields, h('button', { type: 'submit', class: 'primary' }, 'Tạo phòng'));
  }

  #submit(e) {
    e.preventDefault();
    const c = this.controls;
    this.bus.emit('intent.create', {
      game: this.game.id,
      options: Object.fromEntries(Object.entries(c.options).map(([k, el]) => [k, el.value])),
      timeControl: c.timeControl?.value,
      seat: c.seat.value,
      opponent: c.opponent.value || undefined,
    });
  }
}

function field(label, control) {
  return h('label', { class: 'field' }, h('span', {}, label), control);
}
