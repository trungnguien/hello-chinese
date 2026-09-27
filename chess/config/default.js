/**
 * CẤU HÌNH = DỮ LIỆU (nguyên tắc 2 & 3).
 * Mọi quyết định dễ thay đổi được đặt ở đây và chỉ được "gắn" vào implementation
 * lúc khởi động (late binding): đổi transport, kho lưu trữ, biến thể, thời gian,
 * bot, plugin... mà không sửa mã nguồn.
 *
 * Có thể trỏ tới file cấu hình khác bằng biến môi trường CHESS_CONFIG=./my.config.js
 */
export default {
  http: {
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? '0.0.0.0',
  },

  transport: { kind: 'websocket', options: { path: '/ws' } },

  storage: { kind: 'memory', options: {} },

  /** Biến thể được bật — id trong shared/engine/variants. */
  variants: ['standard', 'kingOfTheHill', 'threeCheck'],

  /** Kiểm soát thời gian — kind trỏ tới shared/time. */
  timeControls: [
    { id: 'bullet-1+0', label: '1+0 Bullet', kind: 'fischer', initialMs: 60_000, incrementMs: 0 },
    { id: 'blitz-3+2', label: '3+2 Blitz', kind: 'fischer', initialMs: 180_000, incrementMs: 2_000 },
    { id: 'blitz-5+0', label: '5+0 Blitz', kind: 'fischer', initialMs: 300_000, incrementMs: 0 },
    { id: 'rapid-10+5', label: '10+5 Rapid', kind: 'fischer', initialMs: 600_000, incrementMs: 5_000 },
    { id: 'delay-5d3', label: '5 phút, delay 3s', kind: 'delay', initialMs: 300_000, delayMs: 3_000 },
    { id: 'untimed', label: 'Không giới hạn', kind: 'untimed' },
  ],

  /** Plugin nạp động theo đường dẫn module (tương đối với thư mục server/). */
  plugins: [
    { module: './plugins/notifier.js' },
    { module: './plugins/logger.js' },
    {
      module: './plugins/bots.js',
      options: {
        thinkMs: 600,
        bots: [
          { id: 'random', name: 'Máy (ngẫu nhiên)', description: 'Đi ngẫu nhiên một nước hợp lệ', strategy: 'random' },
          { id: 'greedy', name: 'Máy (tham lam)', description: 'Ăn quân khi có thể, tránh mất quân', strategy: 'greedy' },
        ],
      },
    },
    { module: './plugins/pgnArchive.js', options: { dir: 'data/games' } },
    { module: './plugins/lobbyJanitor.js', options: { abandonAfterMs: 30_000 } },
  ],
};
