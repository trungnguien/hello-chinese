import { Registry } from '../../../shared/core/Registry.js';

/**
 * "Bộ não" tán gẫu — điểm mở rộng (nguyên tắc 1 & 7).
 * Skill chat chỉ phụ thuộc contract dưới đây; có thể thêm brain dùng LLM,
 * brain đa ngôn ngữ... bằng cách register mà không sửa skill.
 *
 * Contract (có thể async):
 *   comment({ event, personality, facts, random }) -> string | null
 *   reply({ text, personality, facts, random })    -> string | null
 */
export const chatBrains = new Registry('chat brain');

/** Bỏ dấu tiếng Việt + chữ thường để so khớp mẫu đơn giản. */
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Điền {fact} vào mẫu; trả về null nếu thiếu fact nào. */
export function fillTemplate(template, facts) {
  let missing = false;
  const text = template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = typeof facts[key] === 'function' ? facts[key]() : facts[key];
    if (value === undefined || value === null || value === '') missing = true;
    return value;
  });
  return missing ? null : text;
}

/** Chọn ngẫu nhiên một mẫu điền được; null nếu không có. */
function pickFilled(templates = [], facts, random) {
  const start = Math.floor(random() * templates.length);
  for (let i = 0; i < templates.length; i++) {
    const text = fillTemplate(templates[(start + i) % templates.length], facts);
    if (text) return text;
  }
  return null;
}

chatBrains.register('rules', {
  comment({ event, personality, facts, random }) {
    const chance = personality.chance?.[event] ?? 1;
    if (random() >= chance) return null;
    return pickFilled(personality.events?.[event], facts, random);
  },
  reply({ text, personality, facts, random }) {
    const input = normalize(text);
    for (const rule of personality.replies ?? []) {
      if (new RegExp(rule.pattern).test(input)) {
        const answer = pickFilled(rule.replies, facts, random);
        if (answer) return answer;
      }
    }
    return pickFilled(personality.fallback, facts, random);
  },
});
