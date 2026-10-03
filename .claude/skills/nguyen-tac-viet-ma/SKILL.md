---
name: nguyen-tac-viet-ma
description: Bảy nguyên tắc thiết kế mã để dễ mở rộng và thay đổi (abstraction, late binding, data-driven, sự kiện, contract ổn định, composition, extension point). Dùng khi viết mới, sửa, refactor hoặc rà soát mã trong repo này, hoặc khi người dùng gọi /nguyen-tac-viet-ma. Có thể truyền đường dẫn file hoặc mô tả tính năng làm đối số.
---

# Nguyên tắc viết mã

Áp dụng 7 nguyên tắc dưới đây khi viết hoặc rà soát mã. Mục tiêu chung: **thay đổi
trong tương lai chỉ cần thêm mã mới hoặc sửa dữ liệu/cấu hình, không phải sửa mã
cũ đang chạy tốt.**

Áp dụng có chừng mực: chỉ trừu tượng hóa ở những chỗ **thực sự có khả năng thay
đổi** (nguồn dữ liệu, nơi lưu trữ, cách hiển thị, ngôn ngữ, quy tắc nghiệp vụ...).
Không tạo lớp trừu tượng cho thứ không bao giờ đổi — đó là phức tạp hóa vô ích.

## Cách dùng skill

- **Có đối số là file/thư mục** → rà soát mã đó theo 7 nguyên tắc (xem
  "Quy trình rà soát").
- **Có đối số là mô tả tính năng** → thiết kế và viết mã tuân theo 7 nguyên tắc,
  sau đó tự rà soát lại trước khi báo xong.
- **Không có đối số** → áp dụng các nguyên tắc cho công việc đang làm trong phiên.

## 7 nguyên tắc

### 1. Phụ thuộc vào abstraction/capability, không phụ thuộc vào đối tượng cụ thể
Mã nghiệp vụ chỉ nên biết "cần một thứ có khả năng X" (lấy từ, lưu tiến độ,
phát âm), không biết thứ đó là `fetch` tới API nào, `localStorage` hay
`speechSynthesis`.

```js
// Không nên: gắn chặt vào API và localStorage
fetch("https://api.example.com/words").then(...);
localStorage.setItem("learnedWords", ...);

// Nên: phụ thuộc vào capability
function createLesson({ wordSource, progressStore, speaker }) { ... }
```

### 2. Trì hoãn quyết định có khả năng thay đổi — late binding
Chọn implementation cụ thể ở **điểm lắp ráp** (composition root, cấu hình, lúc
chạy), không phải sâu trong logic. Ví dụ: nguồn từ vựng, số từ mỗi ngày, ngôn ngữ
phát âm được truyền vào hoặc đọc từ cấu hình khi khởi động.

### 3. Biến hành vi có thể thay đổi thành dữ liệu — data-driven behavior
Những gì hay đổi (danh sách từ, số lượng, các trường hiển thị, quy tắc chọn từ,
chuỗi giao diện) nên nằm trong dữ liệu/cấu hình thay vì `if/else` hay hằng số rải
rác trong mã.

```js
const config = { wordsPerDay: 10, speechLang: "zh-CN",
  fields: ["character", "pinyin", "meaning"] };
```

### 4. Công bố sự kiện thay vì điều khiển trực tiếp mọi hệ quả
Khi điều gì đó xảy ra (đã tải từ, đã học xong một từ, đã bấm nghe), phát ra sự
kiện; các phần quan tâm tự đăng ký lắng nghe. Nơi phát sự kiện không cần biết có
bao nhiêu hệ quả (lưu tiến độ, thống kê, hiệu ứng...).

```js
events.emit("word:played", { word });   // thay vì gọi lần lượt saveStats(), animate(), ...
events.on("word:played", ({ word }) => stats.record(word));
```

### 5. Ổn định contract, cho phép implementation thay đổi
Định nghĩa rõ hình dạng dữ liệu và interface (ví dụ một `Word` luôn có
`{ character, pinyin, meaning }`; `wordSource.getWords(n)` luôn trả về
`Promise<Word[]>`). Dữ liệu từ bên ngoài phải được **chuyển đổi về contract** ở
biên (adapter), để thay API không ảnh hưởng phần còn lại. Khi buộc phải đổi
contract, đổi theo cách tương thích ngược hoặc ghi rõ.

### 6. Thêm chức năng mới bằng composition thay vì sửa phần cũ
Tính năng mới = thêm một module/hàm/plugin mới rồi ghép vào, không phải chèn thêm
nhánh vào hàm đã có. Ưu tiên ghép các hàm nhỏ, decorator/wrapper (ví dụ bọc
`wordSource` bằng một lớp cache), thay vì kế thừa sâu hoặc hàm "làm mọi thứ".

### 7. Thiết kế extension point cho những thứ hôm nay chưa biết
Để sẵn chỗ cắm có chủ đích: registry cho nguồn dữ liệu/kiểu hiển thị/chế độ học,
hook trước/sau các bước chính, sự kiện ở nguyên tắc 4. Extension point phải đơn
giản, có contract rõ (nguyên tắc 5) và có ít nhất một implementation dùng thật.

## Quy trình rà soát

1. Đọc mã cần rà soát và xác định **những gì có khả năng thay đổi** (nguồn dữ liệu,
   lưu trữ, giao diện, ngôn ngữ, quy tắc, số lượng...).
2. Với từng nguyên tắc, tìm vi phạm cụ thể có `file:dòng`. Bỏ qua nguyên tắc
   không liên quan — không ép đủ 7 mục.
3. Với mỗi vi phạm, nêu: điều gì sẽ khó thay đổi trong tương lai, và đề xuất sửa
   tối thiểu (kèm đoạn mã ngắn nếu cần).
4. Xếp theo mức ảnh hưởng: chỗ nào thay đổi có khả năng xảy ra sớm nhất và tốn
   kém nhất đứng trước.
5. Chỉ sửa mã khi người dùng yêu cầu; khi sửa, giữ nguyên hành vi hiện có.

Định dạng báo cáo (tiếng Việt):

```
## Kết quả rà soát theo nguyên tắc viết mã
1. [Nguyên tắc N] file:dòng — vấn đề
   → Đề xuất: ...
...
Điểm đã làm tốt: ...
```

## Kiểm tra nhanh trước khi báo xong

- [ ] Logic nghiệp vụ không gọi trực tiếp API/lưu trữ/thiết bị cụ thể (1)
- [ ] Implementation cụ thể được chọn ở một nơi lắp ráp/cấu hình (2)
- [ ] Hằng số và quy tắc hay đổi nằm trong dữ liệu/cấu hình (3)
- [ ] Hệ quả phụ được xử lý qua sự kiện, không gọi chuỗi trực tiếp (4)
- [ ] Dữ liệu ngoài được chuyển về contract tại biên (5)
- [ ] Tính năng mới được thêm bằng module mới, không chèn nhánh vào mã cũ (6)
- [ ] Có chỗ cắm hợp lý cho phần dễ mở rộng, nhưng không thừa (7)
