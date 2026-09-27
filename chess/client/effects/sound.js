/** Âm thanh khi có nước đi — chỉ nghe sự kiện, không ai gọi trực tiếp (nguyên tắc 4). */
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
    bus.on('game.moved', ({ move }) => beep(move.san.includes('x') ? 330 : 520, move.san.includes('+') ? 0.2 : 0.08));
    bus.on('game.started', () => beep(660, 0.15));
    bus.on('game.ended', () => (beep(440, 0.15), setTimeout(() => beep(330, 0.3), 160)));
  },
};
