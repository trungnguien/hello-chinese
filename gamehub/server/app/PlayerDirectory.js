import { randomUUID } from 'node:crypto';

/**
 * Danh tính người chơi theo token (lưu ở localStorage phía client) để
 * kết nối lại vẫn là cùng một người. Có thể thay bằng OAuth/đăng nhập
 * mà không đổi phần còn lại — chỉ cần giữ contract identify().
 */
export class PlayerDirectory {
  #byToken = new Map();

  identify({ token, name }) {
    const cleanName = sanitizeName(name);
    let player = token ? this.#byToken.get(token) : undefined;
    if (!player) {
      const newToken = token && token.length >= 16 && token.length <= 128 ? token : randomUUID();
      player = { id: 'u_' + randomUUID().slice(0, 8), token: newToken, name: cleanName, isBot: false };
      this.#byToken.set(newToken, player);
    } else if (name) {
      player.name = cleanName;
    }
    return player;
  }
}

function sanitizeName(name) {
  const trimmed = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
  return trimmed || 'Khách ' + Math.floor(1000 + Math.random() * 9000);
}
