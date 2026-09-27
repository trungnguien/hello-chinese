# 🎲 GameHub — Chợ game online

Nền tảng chơi game nhiều người thời gian thực (Node.js + WebSocket + trình duyệt, không cần build).
Nền tảng **không biết luật của game nào**: mỗi game là một *module* cắm vào theo `GameModule` contract.
Hiện có hai game:

| Game | Biến thể (dữ liệu) |
|---|---|
| ♞ **Cờ vua** | Tiêu chuẩn (FIDE), Vua trên đồi, Ba lần chiếu |
| ✕ **Cờ Caro** | Tự do 15×15, Chặn hai đầu (luật Việt Nam), Tic-tac-toe 3×3 |

```bash
cd gamehub
npm install
npm start          # http://localhost:3000   (PORT=xxxx để đổi cổng)
npm test           # 51 test: perft cờ vua, luật caro, test tuân thủ contract cho mọi game, e2e WebSocket
```

**Nền tảng cung cấp cho mọi game:** trang chợ, sảnh theo từng game (form tạo phòng dựng từ manifest),
phòng chơi (ghế, đồng hồ theo ghế, đầu hàng, mời hoà, khán giả, chat, nhật ký diễn biến), chia sẻ link,
kết nối lại, đối thủ máy (kèm kỹ năng tán gẫu), lưu replay JSON của mọi ván.

## Cấu trúc

```
gamehub/
├── config/default.js              Danh sách game, thời gian, bot, plugin — DỮ LIỆU
├── shared/                        "SDK" dùng chung cho nền tảng và module
│   ├── gameModule.js              ★ GameModule contract + kiểm tra khi nạp
│   ├── protocol/contract.js       ★ Contract client <-> server (v2: room.*)
│   ├── core/                      EventBus, Registry
│   ├── time/                      Chiến lược đồng hồ + Clock theo ghế
│   ├── random.js                  RNG có seed (ván tất định, phát lại được)
│   └── dom.js                     Trợ giúp DOM cho client của module
├── games/                         ★ MỖI THƯ MỤC LÀ MỘT GAME
│   ├── chess/
│   │   ├── manifest.js            Tên, ghế, capability, schema lựa chọn, văn bản
│   │   ├── server.js              Adapter: engine cờ vua -> GameModule contract
│   │   ├── engine/                Engine cờ vua (giữ nguyên, perft đúng)
│   │   ├── bots.js
│   │   └── client/                index.js (mount), BoardView, chess.css
│   └── caro/
│       ├── manifest.js, server.js, rules.js, bots.js
│       └── client/                index.js (mount), caro.css
├── server/                        NỀN TẢNG — không import game nào
│   ├── bootstrap.js               Composition root: nạp module theo cấu hình
│   ├── app/                       Room, RoomService, snapshot DTO, ports
│   ├── adapters/                  websocket, bộ nhớ, http
│   ├── delivery/ handlers/        Router + handler theo loại message
│   ├── plugins/                   notifier, logger, bots, archive, lobbyJanitor
│   └── bots/                      Kỹ năng bot (chat), brain, tính cách
└── client/                        VỎ ứng dụng — nạp client của game lúc chạy
    ├── main.js                    Routing: #/  ·  #/g/<game>  ·  #/g/<game>/r/<room>
    ├── games/loader.js            import() động client + CSS của module
    └── ui/                        MarketView, LobbyView, RoomView, RoomList
```

## GameModule contract (tóm tắt — đầy đủ ở `shared/gameModule.js`)

```js
// games/<id>/server.js
export default {
  manifest,                                    // dữ liệu
  createMatch({ options, seats, rng }) -> match,
  bots?:      { [strategyId]: (match, seat) -> action },
  exporters?: { [format]: ({ room, names }) -> { extension, content } },
};
// match
activeSeats() · act(seat, action) -> { text, notes } · outcome() · view(seat)
legalActions?(seat) · timeoutOutcome?(seat) · chatFacts?(seat)

// games/<id>/client/index.js
export function mount(element, api) -> { update(view, ctx), unmount() }   // api.sendAction(action)
```

`view(seat)` quyết định mỗi người được thấy gì (nền tảng cho game có thông tin ẩn như bài).
`notes` (vd. `capture`, `check`, `threat`) cho phép bot/hiệu ứng phản ứng mà không cần hiểu luật.

## Thêm một game mới

1. Tạo `games/<id>/manifest.js`, `server.js` (thoả contract) và `client/index.js` (hàm `mount`).
2. Thêm `{ module: '../games/<id>/server.js' }` vào `config.games`.
3. Thêm module vào `ALL_GAMES` trong `tests/helpers.js` — **bộ test tuân thủ contract** tự chạy:
   chơi ngẫu nhiên mọi biến thể tới khi kết thúc, kiểm tra view JSON hoá được, ghế không tới lượt
   không có hành động, lỗi có mã, bot hợp lệ, và **phát lại nhật ký ra đúng trạng thái**.

Không sửa nền tảng, không sửa client vỏ: thẻ game, form tạo phòng, đối thủ máy (`bot:random` dùng
`legalActions` chung; `bot:greedy` nếu module có), lưu replay đều tự có.

## 7 nguyên tắc trong chợ game

1. **Phụ thuộc vào abstraction/capability** — `RoomService`, bot, chat, archive chỉ biết `GameModule`
   contract. Nút "Mời hoà", "Lật bàn", đồng hồ chỉ xuất hiện khi `manifest.capabilities` khai báo.
2. **Late binding** — game được nạp theo đường dẫn trong cấu hình lúc khởi động (kiểm tra contract
   ngay khi nạp); client của game được `import()` khi vào phòng; bot chọn chiến lược theo id lúc chơi.
3. **Hành vi thành dữ liệu** — manifest, schema lựa chọn (form tự dựng), biến thể cờ vua và caro,
   bảng ánh xạ `notes` -> lời thoại bot, tính cách bot, văn bản lý do kết thúc.
4. **Công bố sự kiện** — `room.created/started/acted/ended/updated`, `draw.offered`, `chat.posted`;
   gửi trạng thái, log, bot, lưu replay, dọn phòng đều là plugin lắng nghe.
5. **Ổn định contract** — hai contract có version (`apiVersion` của module, `PROTOCOL_VERSION`),
   có bộ test tuân thủ; phần riêng của game nằm gọn trong `view`/`action`.
6. **Composition** — thêm Caro không sửa nền tảng; engine cờ vua được bọc bằng adapter, không đổi dòng nào.
7. **Extension point** — `bots`, `exporters`, `timeoutOutcome`, `chatFacts`, `notes`, `capabilities`,
   `Room.meta`; ghế N người và `activeSeats()` trả mảng để sau này có game nhiều người/đi đồng thời.

## Kỹ năng bot: tán gẫu

Mỗi bot khai báo kỹ năng trong cấu hình; kỹ năng `chat` dùng được cho mọi game: chào hỏi, bình luận
theo `notes` của module (ăn quân, chiếu, đe doạ), chúc mừng khi hết ván, trả lời "ai đang thắng",
"gợi ý nước đi" (fact do module cung cấp qua `chatFacts`), tên, khen, chê… Tính cách (`friendly`,
`proud`) là dữ liệu; "brain" có thể thay (mặc định `rules`) qua `chatBrains.register(...)`.

## Giới hạn hiện tại

- Phòng lưu trong bộ nhớ; replay JSON của ván đã xong được ghi ra `data/games/`.
- Mời hoà dành cho game 2 người; contract đã hỗ trợ N ghế nhưng chưa có game nhiều người.
- Module game chạy trong cùng tiến trình server (tin cậy). Mở chợ cho bên thứ ba cần chạy module
  trong sandbox (worker/tiến trình riêng, iframe phía client).
- Protocol v1 (chỉ cờ vua) đã được thay bằng v2; vì client đi kèm server nên không giữ lớp tương thích.
