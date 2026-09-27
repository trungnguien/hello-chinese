/** Ghi log mọi sự kiện nghiệp vụ — chỉ cần subscribe '*' (nguyên tắc 4). */
export default {
  name: 'logger',
  setup({ bus }, { ignore = ['room.updated', 'lobby.changed'] } = {}) {
    return bus.on('*', (type, payload) => {
      if (ignore.includes(type)) return;
      const parts = [];
      if (payload?.room) parts.push(`${payload.room.gameId}/${payload.room.id}`);
      if (payload?.text) parts.push(`${payload.seat ?? ''}:${payload.text}`);
      if (payload?.result) parts.push(`winners=[${payload.result.winners}] (${payload.result.reason})`);
      if (payload?.player) parts.push(`player=${payload.player.name}`);
      console.log(`[event] ${type} ${parts.join(' ')}`);
    });
  },
};
