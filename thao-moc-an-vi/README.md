# Website Thảo Mộc An Vi

Trang tĩnh giới thiệu Công ty Cổ phần Thảo Mộc An Vi. Mở `index.html` trực tiếp trong trình duyệt, không cần build.

## Cấu trúc

| Thư mục | Vai trò |
| --- | --- |
| `core/site.js` | Contract ổn định: `Site.sections`, `Site.blocks`, `Site.contents` (registry), `Site.events` (event bus), `Site.dom.h` |
| `core/boot.js` | Chọn content theo `data-content` trong HTML, dựng section, phát sự kiện |
| `sections/` | Section type: `header`, `hero`, `article`, `footer` |
| `blocks/` | Block type trong `article`: `paragraph`, `ordered-list`, `card-grid`, `tags`, `facts` |
| `plugins/` | Hành vi lắng nghe sự kiện (ví dụ `mobile-nav.js`) |
| `content/` | Toàn bộ nội dung trang dưới dạng dữ liệu |

## Contract

- Section renderer: `Site.sections.register(type, (section, ctx) => HTMLElement)`
- Block renderer: `Site.blocks.register(type, (block, ctx) => HTMLElement)`
- `ctx` = `{ content, h, emit, renderBlocks }`
- Section có `navLabel` sẽ tự xuất hiện trên menu; `tone: "alt"` đổi nền.
- Sự kiện: `section:rendered` `{ section, el }`, `site:rendered` `{ root, content }`, `nav:toggled` `{ isOpen }`

## Mở rộng

- **Sửa nội dung / thêm section:** chỉ sửa `content/company.vi.js`.
- **Loại nội dung mới** (ví dụ thư viện ảnh): tạo `blocks/gallery.js` gọi `Site.blocks.register("gallery", ...)`, thêm thẻ `<script>` và dùng `{ type: "gallery", ... }` trong content.
- **Hành vi mới** (ví dụ analytics, scroll-spy): tạo file trong `plugins/` lắng nghe `Site.events.on(...)`.
- **Ngôn ngữ khác:** tạo `content/company.en.js` đăng ký `"company.en"` rồi đổi `data-content`.
