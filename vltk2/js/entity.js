// Rank tiers control name-tag color/glow, mirroring the crowded "guild tag" look
// from classic wuxia MMO screenshots (gold = server-first title holder, etc).
export const RANKS = {
  VO_VUONG:   { label: "Võ Vương",  color: "#3ad1ff", glow: "#ffe066" },
  VO_TUONG:   { label: "Võ Tướng",  color: "#4bd15a", glow: "#4bd15a" },
  VO_CHU:     { label: "Võ Chủ",    color: "#4bd15a", glow: null },
  BANG_CHU:   { label: "Bang Chủ",  color: "#ff4d4d", glow: null },
  DE_TU:      { label: "Đệ Tử",     color: "#eaeaea", glow: null },
};

export const SECTS = [
  "Thiếu Lâm", "Nga Mi", "Cái Bang", "Đường Môn",
  "Thiên Vương Bang", "Hoa Sơn", "Ngũ Độc", "Côn Lôn",
];

let idCounter = 1;
export function nextId() { return idCounter++; }

export class Entity {
  constructor(opts) {
    this.id = nextId();
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.name = opts.name ?? "???";
    this.sect = opts.sect ?? null;
    this.rank = opts.rank ?? RANKS.DE_TU;
    this.level = opts.level ?? 1;
    this.hp = opts.hp ?? 100;
    this.maxHp = opts.maxHp ?? this.hp;
    this.mounted = opts.mounted ?? false;
    this.bodyColor = opts.bodyColor ?? "#c9a05c";
    this.facing = 1; // 1 = right, -1 = left
    this.speaking = null; // {text, until}
    this.hostile = opts.hostile ?? false;
    this.alive = true;
  }

  get radius() { return this.mounted ? 20 : 14; }

  say(text) {
    this.speaking = { text, until: performance.now() + 3500 };
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) this.alive = false;
  }

  draw(ctx, camX, camY) {
    const sx = this.x - camX;
    const sy = this.y - camY;

    if (this.mounted) this.drawMount(ctx, sx, sy);
    this.drawBody(ctx, sx, sy);
    this.drawNameTag(ctx, sx, sy);
    this.drawSpeech(ctx, sx, sy);
  }

  drawMount(ctx, sx, sy) {
    ctx.fillStyle = "#e8dfc8";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 6, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(sx - 4, sy - 6, 8, 12);
  }

  drawBody(ctx, sx, sy) {
    // torso
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath();
    ctx.ellipse(sx, sy - (this.mounted ? 14 : 0), this.mounted ? 12 : 14, this.mounted ? 16 : 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // head
    ctx.fillStyle = "#f0c48a";
    ctx.beginPath();
    ctx.arc(sx, sy - (this.mounted ? 30 : 20), 8, 0, Math.PI * 2);
    ctx.fill();

    if (!this.alive) {
      ctx.strokeStyle = "#000";
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy - 10);
      ctx.lineTo(sx + 10, sy + 10);
      ctx.stroke();
    }
  }

  drawNameTag(ctx, sx, sy) {
    const topY = sy - (this.mounted ? 46 : 36);
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";

    if (this.rank.glow) {
      ctx.shadowColor = this.rank.glow;
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = this.rank.color;
    const label = this.sect ? `${this.name} [${this.sect}]` : this.name;
    ctx.fillText(label, sx, topY);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = this.rank.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 20, topY + 4);
    ctx.lineTo(sx + 20, topY + 4);
    ctx.stroke();

    if (this.maxHp > 0 && this.hp < this.maxHp) {
      const w = 32;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(sx - w / 2, topY + 8, w, 4);
      ctx.fillStyle = "#e33";
      ctx.fillRect(sx - w / 2, topY + 8, w * (this.hp / this.maxHp), 4);
    }
  }

  drawSpeech(ctx, sx, sy) {
    if (!this.speaking) return;
    if (performance.now() > this.speaking.until) { this.speaking = null; return; }
    const topY = sy - (this.mounted ? 60 : 50);
    ctx.font = "12px Arial";
    const text = this.speaking.text;
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.strokeStyle = "#333";
    const h = 20;
    roundRect(ctx, sx - w / 2, topY - h, w, h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.fillText(text, sx, topY - 6);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
