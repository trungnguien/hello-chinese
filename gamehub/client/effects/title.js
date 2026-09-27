/** Đổi tiêu đề tab khi tới lượt mình — hữu ích khi người chơi mở tab khác. */
export default {
  name: 'title',
  setup({ bus }) {
    const base = document.title;
    bus.on('state.changed', ({ state }) => {
      const room = state.route.view === 'room' ? state.rooms[state.route.roomId] : null;
      const myTurn = room && room.status === 'active' && room.active.includes(room.you);
      document.title = myTurn ? `● Tới lượt bạn — ${base}` : base;
    });
  },
};
