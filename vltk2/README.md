# Vo Lam Truyen Ky Online — Fan Demo (mã nguồn gốc)

Đây là một **game 2D nguyên bản lấy cảm hứng** từ dòng game kiếm hiệp/võ lâm
kiểu "Võ Lâm Truyền Kỳ", viết lại từ đầu bằng HTML5 Canvas + JavaScript
thuần (không dùng framework, không có build step).

## Lưu ý quan trọng

Đây **không phải** là mã nguồn thật của game "Võ Lâm Truyền Kỳ 2" (game
thương mại có bản quyền của nhà phát hành). Mã nguồn/engine/asset gốc của
game đó là tài sản độc quyền và không có sẵn công khai để "xây dựng lại".
Dự án trong thư mục này là một game mới, tự viết, chỉ mượn ý tưởng thể
loại và một số yếu tố giao diện phổ biến của dòng game này (tên nhân vật
màu theo cấp bậc/môn phái, cưỡi ngựa, bang hội, shop NPC, chat...).

## Cách chạy

Mở bằng một static server bất kỳ (cần server vì dùng ES modules), ví dụ:

```bash
cd vltk2
python3 -m http.server 8080
# rồi mở http://localhost:8080
```

## Điều khiển

- `WASD` / phím mũi tên: di chuyển
- `M`: lên/xuống ngựa (tăng tốc độ di chuyển)
- Click vào quái (Sơn Tặc, màu nâu đỏ, phía nam bản đồ): tấn công
- `E` khi đứng gần NPC "Tiểu Nhị" (biển SHOP): mở cửa hàng
- `Enter`: mở ô chat, gõ rồi Enter để gửi

## Cấu trúc mã nguồn

```
vltk2/
  index.html         Khung trang + HUD (panel nhân vật, minimap, chat, shop)
  css/style.css       Toàn bộ style cho HUD
  js/world.js         Kích thước bản đồ, vẽ nền/tòa nhà, va chạm
  js/entity.js        Lớp Entity dùng chung (vẽ thân/tên/hp/bong bóng chat)
  js/npc.js           Sinh NPC dân thường, chủ tiệm, quái (sơn tặc)
  js/player.js         Nhân vật người chơi: điều khiển, exp/level, lưu game
  js/input.js         Bàn phím + chuột
  js/ui.js            Cập nhật panel nhân vật, chat log, panel shop
  js/main.js          Vòng lặp game chính, camera, combat, minimap
```

## Hệ thống đã có

- Bản đồ mở với va chạm nhà cửa, camera theo dõi người chơi
- ~18 NPC dân thường đi lại ngẫu nhiên, tên hiển thị màu theo cấp bậc
  (Bang Chủ = đỏ, Võ Chủ/Võ Tướng = xanh lá, Đệ Tử = trắng), gắn môn phái
  ngẫu nhiên, thỉnh thoảng chat các câu thoại giao lưu
- Cưỡi ngựa (tăng tốc, đổi hình vẽ)
- Chiến đấu cơ bản với "Sơn Tặc": click để đánh, sát thương ngẫu nhiên,
  rơi số máu bay lên, hạ gục nhận exp/vàng, quái hồi sinh sau 8s
- Hệ thống cấp độ/exp/HP/MP, thanh máu-nội lực-kinh nghiệm trên HUD
- NPC bán hàng + panel shop mua bình máu/nội lực/vũ khí bằng vàng
- Chat text người chơi (Enter để gõ) + bong bóng thoại trên đầu nhân vật
- Minimap góc phải hiển thị vị trí người chơi/NPC/quái
- Lưu tiến trình vào `localStorage`, tự động lưu mỗi 5 giây

## Hướng mở rộng gợi ý

- Multiplayer thực sự (Node.js + WebSocket) để nhiều người chơi thấy nhau
- Thay hình vẽ canvas bằng sprite sheet/asset đồ họa riêng
- Hệ thống bang hội thật (tạo/tham gia/rời bang), PK giữa người chơi
- Nhiều loại quái, bản đồ, nhiệm vụ (quest) và item đa dạng hơn
