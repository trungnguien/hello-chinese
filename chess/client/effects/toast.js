import { h } from '../ui/dom.js';

/** Hiển thị thông báo ngắn cho mọi sự kiện 'notice'. */
export default {
  name: 'toast',
  setup({ bus, texts }) {
    const host = h('div', { class: 'toasts', 'aria-live': 'polite' });
    document.body.append(host);
    bus.on('notice', (n) => {
      const message = n.error ? texts.error(n.code, n.message) : texts.notices[n.code] ?? n.message ?? n.code;
      const el = h('div', { class: `toast${n.error ? ' error' : ''}` }, message);
      host.append(el);
      setTimeout(() => el.remove(), 3500);
    });
  },
};
