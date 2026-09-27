import { Registry } from '../../../shared/core/Registry.js';
import chat from './chat.js';

/**
 * KỸ NĂNG của bot — điểm mở rộng (nguyên tắc 6 & 7).
 * Mỗi bot khai báo trong cấu hình danh sách kỹ năng (dữ liệu), ví dụ:
 *   skills: [{ id: 'chat', options: { personality: 'friendly' } }]
 *
 * Contract: factory({ bus, services, player, scheduler, random, options }) -> teardown?
 *  - chỉ tương tác qua bus (nghe sự kiện) và services (use case công khai),
 *  - không sửa đổi trạng thái ván cờ trực tiếp.
 */
export const botSkills = new Registry('bot skill');

botSkills.register('chat', chat);
