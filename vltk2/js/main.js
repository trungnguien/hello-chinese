import { WORLD_W, WORLD_H, drawGround, drawBuildings, shopKeeperSpawn } from "./world.js";
import { spawnCrowd, spawnShopkeeper, spawnBandits, updateNpc } from "./npc.js";
import { Player, persist } from "./player.js";
import { initChat, logChat, updatePlayerPanel, openShop, isShopOpen } from "./ui.js";
import { initInput, keys, mouse, consumeClick } from "./input.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap");
const mctx = minimap.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  minimap.width = minimap.clientWidth;
  minimap.height = minimap.clientHeight;
}
window.addEventListener("resize", resize);
resize();

const player = new Player();
const crowd = spawnCrowd(18);
const shopkeeper = spawnShopkeeper();
const bandits = spawnBandits(6);
const allNpcs = [...crowd, shopkeeper, ...bandits];

initInput(canvas);
initChat((text) => {
  player.say(text);
  logChat(player.name, text, "#ffe08a");
});

const floatingTexts = [];
function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, born: performance.now() });
}

function worldToScreen(x, y, camX, camY) {
  return { x: x - camX, y: y - camY };
}

function tryAttack(camX, camY) {
  const targets = allNpcs.filter((n) => n.hostile && n.alive);
  let best = null, bestDist = 46;
  for (const n of targets) {
    const s = worldToScreen(n.x, n.y, camX, camY);
    const d = Math.hypot(mouse.x - s.x, mouse.y - s.y);
    if (d < bestDist) { best = n; bestDist = d; }
  }
  if (!best) return;

  const distToPlayer = Math.hypot(best.x - player.x, best.y - player.y);
  if (distToPlayer > 90) {
    logChat("Hệ thống", "Mục tiêu ở quá xa, hãy lại gần hơn.", "#888");
    return;
  }
  if (player.attackCooldown > 0) return;

  player.attackCooldown = 0.5;
  const dmg = 8 + Math.floor(Math.random() * 10) + player.level;
  best.takeDamage(dmg);
  addFloatingText(best.x, best.y - 30, `-${dmg}`, "#ff5555");

  if (!best.alive) {
    const expGain = 15 + best.level * 3;
    const goldGain = 3 + Math.floor(Math.random() * 8);
    player.gainExp(expGain);
    player.gold += goldGain;
    logChat("Hệ thống", `Bạn hạ gục ${best.name}, nhận ${expGain} kinh nghiệm và ${goldGain} lượng.`, "#7fd17f");
    setTimeout(() => respawnBandit(best), 8000);
  }
}

function respawnBandit(b) {
  b.alive = true;
  b.hp = b.maxHp;
  b.x = 300 + Math.random() * 900;
  b.y = 900 + Math.random() * 500;
}

function tryOpenShop() {
  const dist = Math.hypot(shopkeeper.x - player.x, shopkeeper.y - player.y);
  if (dist < 100) {
    openShop((item) => {
      if (player.gold < item.price) {
        logChat("Hệ thống", "Không đủ tiền.", "#e33");
        return;
      }
      player.gold -= item.price;
      if (item.id === "potion_hp") { player.hp = player.maxHp; }
      if (item.id === "potion_mp") { player.mp = player.maxMp; }
      logChat("Hệ thống", `Bạn đã mua ${item.name}.`, "#7fd17f");
    });
  } else {
    logChat("Hệ thống", "Bạn cần lại gần Tiểu Nhị (SHOP) để giao dịch.", "#888");
  }
}

let lastTime = performance.now();
let saveTimer = 0;

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!isShopOpen()) {
    player.update(dt, keys);
    if (keys.has("m")) { player.mounted = !player.mounted; keys.delete("m"); }
    if (keys.has("e")) { tryOpenShop(); keys.delete("e"); }
  }

  for (const n of allNpcs) updateNpc(n, dt, now);

  const camX = Math.max(0, Math.min(WORLD_W - canvas.width, player.x - canvas.width / 2));
  const camY = Math.max(0, Math.min(WORLD_H - canvas.height, player.y - canvas.height / 2));

  if (consumeClick()) tryAttack(camX, camY);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround(ctx, camX, camY, canvas.width, canvas.height);
  drawBuildings(ctx, camX, camY);

  const drawOrder = [...allNpcs, player].sort((a, b) => a.y - b.y);
  for (const e of drawOrder) e.draw(ctx, camX, camY);

  const nowT = performance.now();
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const f = floatingTexts[i];
    const age = nowT - f.born;
    if (age > 1000) { floatingTexts.splice(i, 1); continue; }
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x - camX, f.y - camY - age / 30);
  }

  drawMinimap(camX, camY);
  updatePlayerPanel(player);

  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; persist(player); }

  requestAnimationFrame(loop);
}

function drawMinimap(camX, camY) {
  mctx.clearRect(0, 0, minimap.width, minimap.height);
  const sx = minimap.width / WORLD_W;
  const sy = minimap.height / WORLD_H;
  for (const n of allNpcs) {
    if (!n.alive) continue;
    mctx.fillStyle = n.hostile ? "#e33" : "#4bd15a";
    mctx.fillRect(n.x * sx - 1, n.y * sy - 1, 3, 3);
  }
  mctx.fillStyle = "#ffe066";
  mctx.beginPath();
  mctx.arc(player.x * sx, player.y * sy, 3, 0, Math.PI * 2);
  mctx.fill();
  mctx.strokeStyle = "rgba(255,255,255,0.4)";
  mctx.strokeRect(camX * sx, camY * sy, canvas.width * sx, canvas.height * sy);
}

logChat("Hệ thống", "Chào mừng đến với Vo Lam Truyen Ky Online (bản fan-made). Chúc bạn chơi vui!", "#ffe08a");
requestAnimationFrame(loop);
