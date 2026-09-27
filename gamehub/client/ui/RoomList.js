import { h } from '/shared/dom.js';

/** Danh sách phòng — dùng chung cho trang chợ (mọi game) và sảnh của từng game. */
export function renderRoomList(container, { rooms, me, bus, showGame = false }) {
  const sorted = [...rooms].sort((a, b) =>
    a.status === b.status ? b.createdAt - a.createdAt : a.status === 'waiting' ? -1 : 1,
  );
  if (!sorted.length) {
    container.replaceChildren(h('p', { class: 'empty' }, 'Chưa có phòng nào. Hãy tạo một phòng!'));
    return;
  }
  container.replaceChildren(
    ...sorted.map((r) => {
      const mine = r.seats.some((s) => s.player?.id === me?.id);
      const names = r.seats.map((s) => s.player?.name ?? '—').join(' vs ');
      const open = () => bus.emit('intent.open', { gameId: r.game.id, roomId: r.id });
      let action;
      if (mine) action = h('button', { onclick: open }, 'Mở');
      else if (r.status === 'waiting') {
        action = h('button', { class: 'primary', onclick: () => bus.emit('intent.join', { gameId: r.game.id, roomId: r.id }) }, 'Vào chơi');
      } else action = h('button', { onclick: open }, 'Xem');
      const meta = [
        showGame ? r.game.name : null,
        r.summary,
        r.timeControl?.label,
        r.status === 'waiting' ? 'đang chờ' : `${r.actions} lượt`,
      ].filter(Boolean);
      return h(
        'div',
        { class: `room-row ${r.status}` },
        h('span', { class: 'room-icon', 'aria-hidden': 'true' }, r.game.icon),
        h('div', { class: 'room-info' }, h('strong', {}, names), h('span', { class: 'meta' }, meta.join(' · '))),
        action,
      );
    }),
  );
}
