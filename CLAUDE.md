# Nguyên tắc viết mã

Áp dụng các nguyên tắc sau cho mọi thay đổi trong repo này:

0. **Phụ thuộc vào abstraction/capability, không phụ thuộc vào đối tượng cụ thể.**
1. **Trì hoãn những quyết định có khả năng thay đổi** — late binding.
2. **Biến hành vi có thể thay đổi thành dữ liệu** — data-driven behavior.
3. **Công bố sự kiện thay vì điều khiển trực tiếp mọi hệ quả.**
4. **Ổn định contract, cho phép implementation thay đổi.**
5. **Thêm chức năng mới bằng composition** thay vì sửa phần cũ.
6. **Thiết kế extension points** cho những thứ mà hôm nay ta chưa biết.
