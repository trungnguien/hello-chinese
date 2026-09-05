export const WORLD_W = 2400;
export const WORLD_H = 1600;

// Static decor: buildings, stalls, props (all axis-aligned rects with a draw style)
export const buildings = [
  { x: 40, y: 40, w: 340, h: 260, type: "house", label: "" },
  { x: 1900, y: 520, w: 220, h: 160, type: "stall", label: "SHOP" },
  { x: 1980, y: 900, w: 260, h: 200, type: "house", label: "" },
  { x: 900, y: 60, w: 200, h: 140, type: "gate", label: "" },
];

// Simple deterministic pseudo-random stone tile pattern so the ground isn't flat
function hash(x, y) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const TILE = 48;

export function drawGround(ctx, camX, camY, viewW, viewH) {
  const startCol = Math.floor(camX / TILE) - 1;
  const startRow = Math.floor(camY / TILE) - 1;
  const cols = Math.ceil(viewW / TILE) + 2;
  const rows = Math.ceil(viewH / TILE) + 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const col = startCol + c;
      const row = startRow + r;
      const wx = col * TILE;
      const wy = row * TILE;
      const shade = hash(col, row);
      const base = 150 + Math.floor(shade * 25);
      ctx.fillStyle = `rgb(${base},${base - 10},${base - 30})`;
      ctx.fillRect(wx - camX, wy - camY, TILE, TILE);
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.strokeRect(wx - camX, wy - camY, TILE, TILE);
    }
  }
}

export function drawBuildings(ctx, camX, camY) {
  for (const b of buildings) {
    const x = b.x - camX;
    const y = b.y - camY;
    if (b.type === "house") {
      ctx.fillStyle = "#5a4632";
      ctx.fillRect(x, y + b.h * 0.35, b.w, b.h * 0.65);
      ctx.fillStyle = "#8a3f2b";
      ctx.beginPath();
      ctx.moveTo(x - 10, y + b.h * 0.35);
      ctx.lineTo(x + b.w / 2, y - 10);
      ctx.lineTo(x + b.w + 10, y + b.h * 0.35);
      ctx.closePath();
      ctx.fill();
    } else if (b.type === "gate") {
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(x, y, 24, b.h);
      ctx.fillRect(x + b.w - 24, y, 24, b.h);
      ctx.fillStyle = "#8a3f2b";
      ctx.fillRect(x, y - 20, b.w, 24);
    } else if (b.type === "stall") {
      ctx.fillStyle = "#3f3226";
      ctx.fillRect(x, y + b.h * 0.4, b.w, b.h * 0.6);
      ctx.fillStyle = "#1c1712";
      ctx.fillRect(x + b.w / 2 - 40, y + b.h * 0.45, 80, 40);
      ctx.fillStyle = "#f2e2b0";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("SHOP", x + b.w / 2, y + b.h * 0.45 + 26);
    }
  }
}

export function collides(x, y, r) {
  for (const b of buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) {
      return true;
    }
  }
  return x - r < 0 || x + r > WORLD_W || y - r < 0 || y + r > WORLD_H;
}

export const shopKeeperSpawn = { x: 2010, y: 560 };
