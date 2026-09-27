import { CARO_VARIANTS } from './rules.js';

export default {
  id: 'caro',
  apiVersion: 1,
  version: '1.0.0',
  name: 'Cờ Caro',
  icon: '✕',
  tagline: 'Xếp 5 quân thẳng hàng — nhanh, vui, dễ chơi',
  description:
    'Cờ Caro (gomoku) trên bàn 15×15: ai xếp đủ 5 quân X hoặc O liên tiếp trước là thắng. Có luật chặn hai đầu kiểu Việt Nam và Tic-tac-toe 3×3.',
  tags: ['Giải trí', '2 người', 'Việt Nam'],
  seats: [
    { id: 'x', label: 'X' },
    { id: 'o', label: 'O' },
  ],
  capabilities: { clock: true, drawOffers: true, flip: false },
  options: [
    {
      id: 'variant',
      label: 'Luật chơi',
      type: 'select',
      default: 'freestyle',
      choices: Object.entries(CARO_VARIANTS).map(([value, v]) => ({ value, label: v.name, description: v.description })),
    },
  ],
  client: { dir: 'client', entry: 'index.js', styles: 'caro.css' },
  texts: {
    reasons: {
      line_complete: 'Xếp đủ hàng',
      board_full: 'Hết ô trống',
    },
  },
};
