/**
 * RNG có seed (mulberry32). Nền tảng cấp cho module game để ván chơi tất định:
 * cùng seed + cùng nhật ký hành động => cùng trạng thái (phát lại, khôi phục).
 */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
