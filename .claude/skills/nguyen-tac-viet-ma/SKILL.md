---
name: nguyen-tac-viet-ma
description: Bảy nguyên tắc viết mã giúp code dễ thay đổi và mở rộng (abstraction/capability, late binding, data-driven behavior, event, contract ổn định, composition, extension points). Dùng khi viết mới, sửa, refactor hoặc review code trong repo này, hoặc khi người dùng gọi /nguyen-tac-viet-ma.
---

# Nguyên tắc viết mã — 7 nguyên tắc

Mục tiêu: code có thể thay đổi và mở rộng mà không phải sửa lan rộng phần đã có.
Áp dụng ở mức vừa đủ — không tạo abstraction cho thứ chắc chắn không đổi.

## Các nguyên tắc

### 0. Phụ thuộc vào abstraction/capability, không phụ thuộc vào đối tượng cụ thể
Hỏi "mình cần *khả năng* gì?" thay vì "mình cần *đối tượng* nào?".
Nhận vào một hàm/interface (vd. `speak(text)`, `storage.get/set`) thay vì gọi thẳng `window.speechSynthesis` hay `localStorage` ở khắp nơi.

### 1. Trì hoãn những quyết định có khả năng thay đổi — late binding
Không hard-code những gì có thể đổi (nguồn dữ liệu, ngôn ngữ, giọng đọc, URL, chiến lược chấm điểm).
Truyền vào qua tham số, cấu hình hoặc tra cứu lúc chạy; quyết định ở rìa hệ thống (lúc khởi tạo), không chôn trong logic.

### 2. Biến hành vi có thể thay đổi thành dữ liệu — data-driven behavior
Nội dung bài học, từ vựng, cấp độ, luật chấm điểm, thứ tự màn hình… nên là dữ liệu (object/JSON/bảng tra) được một bộ xử lý chung đọc.
Dấu hiệu cần áp dụng: chuỗi `if/else` hoặc `switch` dài theo loại; các khối code chỉ khác nhau ở giá trị.

### 3. Công bố sự kiện thay vì điều khiển trực tiếp mọi hệ quả
Khi một việc xảy ra (trả lời đúng, hoàn thành bài), phát sự kiện (`emit('answer:correct', payload)`) và để các phần quan tâm (điểm, âm thanh, tiến độ, thống kê) tự lắng nghe.
Nơi phát không cần biết ai phản ứng.

### 4. Ổn định contract, cho phép implementation thay đổi
Giữ cố định tên hàm, tham số, cấu trúc dữ liệu và tên sự kiện công khai; tự do thay đổi phần bên trong.
Khi buộc phải đổi contract: mở rộng tương thích ngược (thêm trường tuỳ chọn) thay vì sửa/xoá trường cũ.

### 5. Thêm chức năng mới bằng composition thay vì sửa phần cũ
Chức năng mới = module mới được ghép vào (đăng ký handler, bọc hàm, thêm plugin), không phải chèn thêm nhánh vào hàm cũ.
Ưu tiên ghép các hàm/đối tượng nhỏ hơn là kế thừa sâu.

### 6. Thiết kế extension points cho những thứ hôm nay ta chưa biết
Chừa sẵn chỗ cắm: registry (`register(type, handler)`), hook trước/sau, sự kiện, cấu hình mặc định có thể ghi đè.
Chỉ đặt extension point ở nơi có khả năng biến đổi thật — đừng tổng quát hoá mọi thứ.

## Quy trình khi viết/sửa code

1. Xác định phần nào **có khả năng thay đổi** (nội dung, nguồn dữ liệu, UI, luật) và phần nào ổn định.
2. Với phần ổn định: định nghĩa **contract** (hàm, cấu trúc dữ liệu, tên sự kiện) trước.
3. Với phần thay đổi: đưa vào **dữ liệu/cấu hình** hoặc **implementation có thể thay thế** sau contract.
4. Nối các phần bằng **sự kiện** hoặc **composition**, không gọi chéo trực tiếp.
5. Thêm chức năng mới bằng **module mới đăng ký vào extension point**, không sửa module cũ.

## Checklist review

- [ ] Code có gọi thẳng API/đối tượng cụ thể ở nhiều nơi mà lẽ ra nên qua một capability không? (0)
- [ ] Có giá trị/quyết định hay đổi bị hard-code trong logic không? (1)
- [ ] Có `if/else`/`switch` theo loại có thể thay bằng bảng dữ liệu không? (2)
- [ ] Một hàm có đang trực tiếp kích hoạt nhiều hệ quả không liên quan không? (3)
- [ ] Thay đổi này có phá vỡ contract công khai không? Có cách tương thích ngược không? (4)
- [ ] Chức năng mới có buộc sửa code cũ không, hay có thể ghép vào? (5)
- [ ] Chỗ dễ biến đổi nhất đã có điểm mở rộng chưa? Có extension point nào thừa không? (6)

Khi review, nêu rõ nguyên tắc bị vi phạm (theo số), vị trí `file:line`, và đề xuất sửa cụ thể.
