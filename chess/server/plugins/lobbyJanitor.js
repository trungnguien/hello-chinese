/**
 * Dọn dẹp: huỷ phòng chờ khi người tạo rời mạng quá lâu, xoá ván đã kết thúc cũ.
 * Hoàn toàn dựa trên sự kiện 'player.offline' / 'player.online' do ConnectionHub phát ra.
 */
export default {
  name: 'lobbyJanitor',
  setup({ bus, services }, { abandonAfterMs = 30000, keepEndedMs = 3600000, sweepEveryMs = 60000 } = {}) {
    const pending = new Map();

    const offOffline = bus.on('player.offline', ({ player }) => {
      pending.set(
        player.id,
        setTimeout(async () => {
          pending.delete(player.id);
          for (const s of await services.games.list()) {
            if (s.status === 'waiting' && s.colorOf(player.id)) await services.games.remove(s);
          }
        }, abandonAfterMs),
      );
    });
    const offOnline = bus.on('player.online', ({ player }) => {
      clearTimeout(pending.get(player.id));
      pending.delete(player.id);
    });

    const sweeper = setInterval(async () => {
      const now = Date.now();
      for (const s of await services.games.list()) {
        if (s.status === 'ended' && now - s.endedAt > keepEndedMs) await services.games.remove(s);
      }
    }, sweepEveryMs);

    return () => {
      offOffline();
      offOnline();
      clearInterval(sweeper);
      pending.forEach(clearTimeout);
    };
  },
};
