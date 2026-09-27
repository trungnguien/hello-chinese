/** Ghi log mọi sự kiện nghiệp vụ — chỉ cần subscribe '*' (nguyên tắc 4). */
export default {
  name: 'logger',
  setup({ bus }, { ignore = ['game.updated', 'lobby.changed'] } = {}) {
    return bus.on('*', (type, payload) => {
      if (ignore.includes(type)) return;
      const parts = [];
      if (payload?.session) parts.push(`game=${payload.session.id}`);
      if (payload?.record) parts.push(`move=${payload.record.san}`);
      if (payload?.result) parts.push(`result=${payload.result.score} (${payload.result.reason})`);
      if (payload?.player) parts.push(`player=${payload.player.name}`);
      console.log(`[event] ${type} ${parts.join(' ')}`);
    });
  },
};
