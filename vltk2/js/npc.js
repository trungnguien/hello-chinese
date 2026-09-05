import { Entity, RANKS, SECTS } from "./entity.js";
import { WORLD_W, WORLD_H, collides, shopKeeperSpawn } from "./world.js";

const GIVEN_NAMES = [
  "Lãng Tử", "Hào Kiệt", "Công Tử", "Tiểu Long", "Lam Tiêu",
  "Bạch Vân", "Hắc Phong", "Thanh Kiếm", "Tuyết Nhi", "Phi Yến",
  "Độc Cô", "Kim Vũ", "Mộ Dung", "Tiêu Sơn", "Lăng Vũ",
];

function randomName() {
  return GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)] + (1 + Math.floor(Math.random() * 99));
}

const RANK_POOL = [RANKS.DE_TU, RANKS.DE_TU, RANKS.DE_TU, RANKS.BANG_CHU, RANKS.VO_CHU, RANKS.VO_TUONG];

export function spawnCrowd(count) {
  const npcs = [];
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = 100 + Math.random() * (WORLD_W - 200);
      y = 100 + Math.random() * (WORLD_H - 200);
    } while (collides(x, y, 20));

    const rank = RANK_POOL[Math.floor(Math.random() * RANK_POOL.length)];
    const npc = new Entity({
      x, y,
      name: randomName(),
      sect: Math.random() < 0.8 ? SECTS[Math.floor(Math.random() * SECTS.length)] : null,
      rank,
      level: 5 + Math.floor(Math.random() * 60),
      hp: 100, maxHp: 100,
      mounted: Math.random() < 0.4,
      bodyColor: ["#c9a05c", "#7ba0c9", "#c97b9a", "#8ac97b"][Math.floor(Math.random() * 4)],
    });
    npc.wanderTarget = { x: npc.x, y: npc.y };
    npc.nextChat = performance.now() + Math.random() * 15000;
    npcs.push(npc);
  }
  return npcs;
}

const CHAT_LINES = [
  "Ai muốn luyện bảo không?", "Bang hội tuyển người, ib mình!",
  "Đổi ngũ hành đây, ai cần liên hệ.", "Hôm nay đẹp trời ghê.",
  "Tổ đội đi phó bản không mọi người?", "Bán ít đan dược giá rẻ đây.",
];

export function updateNpc(npc, dt, now) {
  if (!npc.alive) return;

  const dx = npc.wanderTarget.x - npc.x;
  const dy = npc.wanderTarget.y - npc.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 6) {
    npc.wanderTarget = {
      x: Math.max(60, Math.min(WORLD_W - 60, npc.x + (Math.random() - 0.5) * 400)),
      y: Math.max(60, Math.min(WORLD_H - 60, npc.y + (Math.random() - 0.5) * 400)),
    };
  } else {
    const speed = (npc.mounted ? 90 : 50) * dt;
    const nx = npc.x + (dx / dist) * speed;
    const ny = npc.y + (dy / dist) * speed;
    if (!collides(nx, ny, npc.radius)) {
      npc.x = nx;
      npc.y = ny;
      npc.facing = dx >= 0 ? 1 : -1;
    }
  }

  if (now > npc.nextChat) {
    npc.say(CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)]);
    npc.nextChat = now + 10000 + Math.random() * 20000;
  }
}

export function spawnShopkeeper() {
  const npc = new Entity({
    x: shopKeeperSpawn.x, y: shopKeeperSpawn.y,
    name: "Tiểu Nhị", sect: null, rank: RANKS.DE_TU,
    level: 1, hp: 999, maxHp: 999,
    bodyColor: "#d0d0d0",
  });
  npc.wanderTarget = { x: npc.x, y: npc.y };
  npc.nextChat = Infinity;
  return npc;
}

export function spawnBandits(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = 300 + Math.random() * 900;
      y = 900 + Math.random() * 500;
    } while (collides(x, y, 20));
    const b = new Entity({
      x, y, name: "Sơn Tặc", sect: null,
      rank: RANKS.DE_TU, level: 3 + Math.floor(Math.random() * 10),
      hp: 60, maxHp: 60, bodyColor: "#8a4a3a", hostile: true,
    });
    b.wanderTarget = { x: b.x, y: b.y };
    b.nextChat = Infinity;
    list.push(b);
  }
  return list;
}
