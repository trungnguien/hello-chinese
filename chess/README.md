# ♞ Cờ vua online

Ứng dụng cờ vua nhiều người chơi thời gian thực (Node.js + WebSocket + trình duyệt, không cần build),
được thiết kế theo 7 nguyên tắc mở rộng.

```bash
cd chess
npm install
npm start          # http://localhost:3000   (PORT=xxxx để đổi cổng)
npm test           # 21 test: perft engine, use case, end-to-end qua WebSocket
```

**Tính năng:** sảnh chờ thời gian thực · tạo/vào phòng · chia sẻ link phòng · khán giả · chat ·
đồng hồ Fischer/delay · đầu hàng, mời hoà · chơi với máy (ngẫu nhiên / tham lam) ·
3 biến thể (tiêu chuẩn, Vua trên đồi, Ba lần chiếu) · kéo-thả hoặc bấm để đi · phong cấp ·
kết nối lại tự động (giữ nguyên danh tính bằng token) · lưu PGN ván đã xong · giao diện sáng/tối, điện thoại.

Luật đầy đủ: nhập thành, bắt tốt qua đường, phong cấp, chiếu hết, hết nước, lặp 3 lần, 50 nước,
không đủ quân. Độ chính xác của bộ sinh nước đi được kiểm chứng bằng **perft** trên các thế chuẩn
(khai cuộc, Kiwipete, vị trí 3, vị trí 4).

## Cấu trúc

```
chess/
├── config/default.js          Cấu hình = dữ liệu: transport, storage, biến thể, thời gian, bot, plugin
├── shared/                    Chạy được cả server lẫn trình duyệt
│   ├── core/                  EventBus, Registry (điểm mở rộng tổng quát)
│   ├── protocol/contract.js   CONTRACT client <-> server (có version)
│   ├── time/                  Chiến lược đồng hồ (fischer, delay, untimed) + Clock
│   └── engine/
│       ├── pieces.js          Quân cờ mô tả bằng dữ liệu
│       ├── movement/          Kiểu di chuyển: leap, slide, pawn
│       ├── rules/             Luật đặc biệt: castling, enPassant, promotion
│       ├── endConditions/     checkmate, stalemate, repetition, moveRule, ..., reachSquares, checkCount
│       ├── variants/          Biến thể = ghép dữ liệu
│       ├── Variant.js         Lắp ráp biến thể từ dữ liệu (late binding)
│       ├── Engine.js          Sinh/áp dụng nước đi — không chứa luật cụ thể
│       └── Game.js            Ván cờ, phát sự kiện 'moved' / 'ended'
├── server/
│   ├── bootstrap.js           COMPOSITION ROOT — nơi duy nhất biết lớp cụ thể
│   ├── app/                   Use case (GameService), port, DTO snapshot
│   ├── adapters/              websocket transport, memory storage, http
│   ├── delivery/              ConnectionHub, MessageRouter
│   ├── handlers/              Mỗi loại message một handler
│   ├── plugins/               notifier, logger, bots, pgnArchive, lobbyJanitor
│   └── bots/strategies.js     Chiến lược của máy
└── client/                    ES modules thuần, không framework
    ├── main.js                Composition root phía client
    ├── net/                   Transport registry + ServerConnection
    ├── state/                 Store + registry xử lý message server
    ├── ui/                    BoardView, LobbyView, GameView, texts, pieceSets
    └── effects/               sound, title, toast (chỉ nghe sự kiện)
```

## 7 nguyên tắc được áp dụng ở đâu

### 1. Phụ thuộc vào abstraction/capability, không vào đối tượng
- `GameService` nhận `repository`, `scheduler`, `now`, `clockKinds`, `bus` qua constructor; chỉ biết
  contract trong `server/app/ports.js`. Test thay thời gian thật bằng scheduler giả (`tests/service.test.js`).
- `Engine` không biết Mã hay Xe; nó hỏi *capability*: `pieceDef(type).movement`, `movement(kind).attacks()`,
  `rule.generate/expand/apply`, `pieceDef.royal`.
- Bot đi cờ qua **đúng** use case `services.games.move` mà người thật dùng — không có đường tắt.
- Client `ServerConnection` chỉ cần một object `{ connect, send, events }`, không biết WebSocket.

### 2. Trì hoãn quyết định dễ thay đổi — late binding
- `config/default.js` chỉ chứa **id**: `transport.kind`, `storage.kind`, `variants`, `timeControls[].kind`,
  `plugins[].module`. `bootstrap.js` phân giải chúng qua registry **lúc khởi động**; plugin được `import()` động.
- Biến thể được lắp từ định nghĩa lúc build (`buildVariant`), chiến lược đồng hồ được tra theo `kind` khi tạo ván.
- Client hỏi `/api/client-config` để biết dùng transport nào; danh sách biến thể/thời gian/đối thủ đến từ `catalog`.
- `CHESS_CONFIG=./other.config.js npm start` đổi cả cấu hình mà không sửa mã.

### 3. Biến hành vi có thể thay đổi thành dữ liệu
- Quân cờ (`pieces.js`): vector di chuyển, giá trị, chữ cái SAN, `royal`, luật phong cấp — đều là dữ liệu.
- Nhập thành được mô tả bằng bảng ô vua/xe/ô phải trống/ô phải an toàn (dùng lại được cho Chess960).
- Biến thể, điều kiện kết thúc (kèm tham số: `count: 3`, `halfmoves: 100`), kiểm soát thời gian, danh sách bot,
  schema message, văn bản giao diện (`texts.js`), bộ quân (`pieceSets.js`), màu bàn cờ (CSS variables).

### 4. Công bố sự kiện thay vì điều khiển trực tiếp mọi hệ quả
- `Game` phát `moved`/`ended`; `GameService` phát `game.*`, `draw.offered`, `chat.posted`, `lobby.changed`;
  `ConnectionHub` phát `player.online/offline`.
- Mọi hệ quả là người nghe độc lập: gửi trạng thái cho client (`notifier`), ghi log (`logger`), lưu PGN
  (`pgnArchive`), bot trả lời (`bots`), huỷ phòng bỏ rơi (`lobbyJanitor`).
- Client: view phát `intent.*`; âm thanh, tiêu đề tab, thông báo là effect chỉ nghe sự kiện.
- `EventBus` cô lập lỗi: một plugin hỏng không làm hỏng ván cờ.

### 5. Ổn định contract, cho phép implementation thay đổi
- `shared/protocol/contract.js`: phong bì có `v`, danh sách message, schema, mã lỗi ổn định, quy tắc tiến hoá
  (chỉ thêm; bên nhận bỏ qua trường/message lạ).
- `server/app/snapshot.js` là lớp chống ăn mòn: cấu trúc nội bộ đổi thoải mái, DTO `GAME_STATE` giữ nguyên.
- Nước đi trên dây luôn là UCI; repository có contract async ngay từ đầu để đổi sang DB không ảnh hưởng người gọi.

### 6. Thêm chức năng mới bằng composition thay vì sửa phần cũ
- "Vua trên đồi" và "Ba lần chiếu" = `{ ...STANDARD, endConditions: [mới, ...cũ] }` — engine không đổi một dòng.
- Chơi với máy, lưu PGN, route `/api/archive`, dọn phòng là **plugin** thêm vào, không sửa `GameService`.
- Loại message mới = thêm handler vào registry; loại hành động UI mới = thêm intent.

### 7. Extension points cho những điều hôm nay chưa biết
Mọi registry đều là điểm cắm: `movementKinds`, `ruleFactories`, `endConditionFactories`, `variantDefinitions`,
`timeControlKinds`, `botStrategies`, và phía server `transports`, `repositories`, `handlers`, `opponents`,
`httpRoutes`; phía client `clientTransports`, `serverHandlers`, `pieceSets`. Thêm vào đó:
`Position.extra` và `GameSession.meta` để rule/plugin tương lai lưu trạng thái riêng; `move.flags` để rule
gắn thông tin; kích thước bàn cờ trên client suy ra từ FEN; quân lạ vẫn hiển thị bằng chữ cái.

## Ví dụ mở rộng

**Thêm quân mới (Archbishop = Tượng + Mã)** — chỉ dữ liệu:

```js
variantDefinitions.register('archbishop', {
  ...STANDARD,
  id: 'archbishop', name: 'Có Tổng giám mục',
  pieces: { ...STANDARD.pieces, a: { name: 'Tổng giám mục', value: 7, sanLetter: 'A', movement: [
    { kind: 'slide', vectors: [[1,1],[1,-1],[-1,1],[-1,-1]] },
    { kind: 'leap',  vectors: [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]] },
  ] } },
  initialFen: 'rnbqkbar/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBAR w KQkq - 0 1',
});
```
rồi thêm `'archbishop'` vào `config.variants`.

**Thêm plugin** — tạo file và khai báo trong `config.plugins`:

```js
// server/plugins/stats.js
export default {
  name: 'stats',
  setup({ bus, registries }) {
    let finished = 0;
    registries.httpRoutes.register('GET /api/stats', async () => ({ finished }));
    return bus.on('game.ended', () => finished++);
  },
};
```

## Kỹ năng của bot: tán gẫu

Mỗi bot khai báo **kỹ năng** trong cấu hình (dữ liệu), plugin `bots` lắp chúng vào lúc khởi động:

```js
{ id: 'greedy', strategy: 'greedy',
  skills: [{ id: 'chat', options: { personality: 'proud', brain: 'rules', cooldownMs: 3000 } }] }
```

Kỹ năng `chat` (`server/bots/skills/chat.js`) chỉ **nghe sự kiện** và nói qua use case `games.chat`
giống người thật:

| Sự kiện | Bot làm gì |
|---|---|
| `game.started` | Chào đối thủ |
| `game.moved` | Bình luận khi ăn quân, mất quân, chiếu, bị chiếu (theo xác suất) |
| `game.ended` | Chúc mừng / tiếc nuối / nói về ván hoà |
| `draw.offered` | Giải thích vì sao từ chối hoà |
| `chat.posted` | Trả lời tin nhắn: chào, hỏi tên, "ai đang thắng", "gợi ý nước đi", khen, chê, tạm biệt… |

- **Tính cách = dữ liệu** (`server/bots/chat/personalities.js`): `friendly` (Máy ngẫu nhiên) và
  `proud` (Máy tham lam). Mẫu câu có `{opponent}`, `{piece}`, `{assessment}`, `{hint}`…; fact nào
  không dùng được trong ngữ cảnh thì câu đó tự bị bỏ qua.
- **Brain có thể thay** (`server/bots/chat/brains.js`): mặc định `rules` (so khớp mẫu, không dấu).
  Muốn bot trò chuyện bằng mô hình ngôn ngữ chỉ cần `chatBrains.register('llm', { comment, reply })`
  rồi đặt `brain: 'llm'` trong cấu hình — skill không đổi.
- Chống spam: cooldown cho bình luận tự phát, tối đa N tin/ván, không trả lời chính mình hay bot khác.
- Kỹ năng mới (ví dụ `taunt`, `coach`, `emote`) = `botSkills.register(id, factory)`.

**Đổi kho lưu trữ** — `registries.repositories.register('redis', createRedisRepository)` rồi
`storage: { kind: 'redis' }` trong cấu hình.
