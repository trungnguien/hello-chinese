/** Đổi tiêu đề tab khi tới lượt mình — hữu ích khi người chơi mở tab khác. */
export default {
  name: 'title',
  setup({ bus }) {
    const base = document.title;
    bus.on('state.changed', ({ state }) => {
      const game = state.route.view === 'game' ? state.games[state.route.gameId] : null;
      const myTurn = game && game.status === 'active' && game.you === game.turn;
      document.title = myTurn ? `● Tới lượt bạn — ${base}` : base;
    });
  },
};
