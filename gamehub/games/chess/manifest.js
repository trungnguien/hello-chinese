import { variantDefinitions } from './engine/index.js';

/** Manifest cờ vua — DỮ LIỆU mà chợ game dùng để hiển thị, tạo phòng, nạp client. */
export default {
  id: 'chess',
  apiVersion: 1,
  version: '1.1.0',
  name: 'Cờ vua',
  icon: '♞',
  tagline: 'Trò chơi trí tuệ kinh điển cho 2 người',
  description:
    'Cờ vua đầy đủ luật FIDE: nhập thành, bắt tốt qua đường, phong cấp, hoà lặp 3 lần, luật 50 nước. Có thêm biến thể Vua trên đồi và Ba lần chiếu.',
  tags: ['Chiến thuật', '2 người', 'Cổ điển'],
  seats: [
    { id: 'w', label: 'Trắng' },
    { id: 'b', label: 'Đen' },
  ],
  capabilities: { clock: true, drawOffers: true, flip: true },
  options: [
    {
      id: 'variant',
      label: 'Biến thể',
      type: 'select',
      default: 'standard',
      choices: variantDefinitions.entries().map(([value, def]) => ({ value, label: def.name, description: def.description })),
    },
  ],
  client: { dir: 'client', entry: 'index.js', styles: 'chess.css' },
  texts: {
    reasons: {
      checkmate: 'Chiếu hết',
      stalemate: 'Hết nước đi (pat)',
      repetition: 'Lặp lại thế cờ 3 lần',
      fifty_moves: 'Luật 50 nước',
      insufficient_material: 'Không đủ quân để chiếu hết',
      king_of_the_hill: 'Vua đã lên đồi',
      check_count: 'Chiếu đủ 3 lần',
      timeout_insufficient: 'Hết giờ, nhưng đối phương không đủ quân',
    },
  },
};
