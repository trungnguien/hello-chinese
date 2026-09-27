import { h } from '/shared/dom.js';
import { renderRoomList } from './RoomList.js';

/**
 * Trang CHỢ GAME: thẻ game dựng hoàn toàn từ manifest trong catalog (nguyên tắc 3).
 * Thêm module game ở server => thẻ tự xuất hiện, client không đổi.
 */
export class MarketView {
  constructor({ bus }) {
    this.bus = bus;
    this.nameInput = h('input', { type: 'text', maxlength: 24, placeholder: 'Tên của bạn', autocomplete: 'nickname' });
    this.cards = h('div', { class: 'game-cards' });
    this.rooms = h('div', { class: 'room-list' });
    this.el = h(
      'section',
      { class: 'market' },
      h(
        'div',
        { class: 'market-head' },
        h('div', {}, h('h1', {}, 'Chợ game'), h('p', { class: 'meta' }, 'Chọn một game, tạo phòng và chơi ngay với bạn bè hoặc với máy.')),
        h(
          'form',
          {
            class: 'identity',
            onsubmit: (e) => {
              e.preventDefault();
              bus.emit('intent.rename', { name: this.nameInput.value });
            },
          },
          this.nameInput,
          h('button', { type: 'submit' }, 'Lưu tên'),
        ),
      ),
      this.cards,
      h('div', { class: 'card' }, h('h2', {}, 'Phòng đang mở'), this.rooms),
    );
  }

  render(state) {
    if (state.me && document.activeElement !== this.nameInput) this.nameInput.value = state.me.name;
    const counts = {};
    for (const r of state.lobby) counts[r.game.id] = (counts[r.game.id] ?? 0) + 1;
    this.cards.replaceChildren(
      ...state.catalog.games.map((g) =>
        h(
          'article',
          { class: 'game-card' },
          h('div', { class: 'game-card-icon', 'aria-hidden': 'true' }, g.icon),
          h('h2', {}, g.name),
          h('p', { class: 'tagline' }, g.tagline),
          h('div', { class: 'tags' }, (g.tags ?? []).map((t) => h('span', { class: 'tag' }, t))),
          h(
            'div',
            { class: 'game-card-foot' },
            h('span', { class: 'meta' }, `${counts[g.id] ?? 0} phòng đang mở`),
            h('button', { class: 'primary', onclick: () => this.bus.emit('intent.game', { gameId: g.id }) }, 'Chơi'),
          ),
        ),
      ),
    );
    renderRoomList(this.rooms, { rooms: state.lobby, me: state.me, bus: this.bus, showGame: true });
  }
}
