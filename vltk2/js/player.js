import { Entity, RANKS } from "./entity.js";
import { collides } from "./world.js";

const SAVE_KEY = "vltk2_save_v1";

export class Player extends Entity {
  constructor() {
    const saved = loadSave();
    super({
      x: saved?.x ?? 1000,
      y: saved?.y ?? 750,
      name: saved?.name ?? "Hiệp Khách",
      sect: saved?.sect ?? "Thiếu Lâm",
      rank: RANKS.DE_TU,
      level: saved?.level ?? 1,
      hp: saved?.hp ?? 100,
      maxHp: 100 + (saved?.level ?? 1) * 10,
      bodyColor: "#e0b060",
    });
    this.mp = saved?.mp ?? 50;
    this.maxMp = 50 + this.level * 5;
    this.exp = saved?.exp ?? 0;
    this.expToLevel = this.level * 100;
    this.gold = saved?.gold ?? 50;
    this.mounted = saved?.mounted ?? false;
    this.attackCooldown = 0;
  }

  gainExp(amount) {
    this.exp += amount;
    while (this.exp >= this.expToLevel) {
      this.exp -= this.expToLevel;
      this.level += 1;
      this.expToLevel = this.level * 100;
      this.maxHp += 10;
      this.maxMp += 5;
      this.hp = this.maxHp;
      this.mp = this.maxMp;
    }
  }

  update(dt, keys) {
    let dx = 0, dy = 0;
    if (keys.has("arrowup") || keys.has("w")) dy -= 1;
    if (keys.has("arrowdown") || keys.has("s")) dy += 1;
    if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
    if (keys.has("arrowright") || keys.has("d")) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      const speed = (this.mounted ? 260 : 150) * dt;
      const nx = this.x + dx * speed;
      const ny = this.y + dy * speed;
      if (!collides(nx, this.y, this.radius)) this.x = nx;
      if (!collides(this.x, ny, this.radius)) this.y = ny;
      this.facing = dx >= 0 ? 1 : (dx < 0 ? -1 : this.facing);
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
  }

  toSave() {
    return {
      x: this.x, y: this.y, name: this.name, sect: this.sect,
      level: this.level, hp: this.hp, mp: this.mp, exp: this.exp,
      gold: this.gold, mounted: this.mounted,
    };
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persist(player) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(player.toSave()));
  } catch { /* storage unavailable */ }
}
