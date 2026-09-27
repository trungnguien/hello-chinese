/** Âm thanh khi có hành động — chỉ nghe sự kiện, không ai gọi trực tiếp (nguyên tắc 4). */
export default {
  name: 'sound',
  setup({ bus }) {
    let ctx = null;
    const beep = (freq, duration = 0.08, gain = 0.05) => {
      try {
        ctx ??= new AudioContext();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = freq;
        g.gain.value = gain;
        osc.connect(g).connect(ctx.destination);
        osc.start();
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
      } catch {
        /* trình duyệt chặn âm thanh — bỏ qua */
      }
    };
    bus.on('room.acted', () => beep(520));
    bus.on('room.started', () => beep(660, 0.15));
    bus.on('room.ended', () => (beep(440, 0.15), setTimeout(() => beep(330, 0.3), 160)));
  },
};
