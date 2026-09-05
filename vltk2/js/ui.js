const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

export function initChat(onSend) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text) onSend(text);
    chatInput.value = "";
    chatInput.blur();
  });
}

export function isChatFocused() {
  return document.activeElement === chatInput;
}

export function focusChat() {
  chatInput.focus();
}

export function logChat(name, text, color = "#e7dcc0") {
  const line = document.createElement("div");
  line.innerHTML = `<span style="color:${color};font-weight:bold">${escapeHtml(name)}:</span> ${escapeHtml(text)}`;
  chatLog.appendChild(line);
  chatLog.scrollTop = chatLog.scrollHeight;
  while (chatLog.children.length > 60) chatLog.removeChild(chatLog.firstChild);
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

export function updatePlayerPanel(player) {
  document.getElementById("player-name").textContent =
    `${player.name} [${player.sect}] - Cấp ${player.level}`;
  setBar("hp", player.hp, player.maxHp);
  setBar("mp", player.mp, player.maxMp);
  setBar("exp", player.exp, player.expToLevel);
  document.getElementById("stat-level").textContent = player.level;
  document.getElementById("stat-gold").textContent = player.gold;
}

function setBar(id, val, max) {
  const pct = Math.max(0, Math.min(100, (val / max) * 100));
  document.getElementById(`${id}-fill`).style.width = pct + "%";
  document.getElementById(`${id}-text`).textContent = `${Math.floor(val)}/${Math.floor(max)}`;
}

const shopPanel = document.getElementById("shop-panel");
const shopItemsEl = document.getElementById("shop-items");
document.getElementById("shop-close").addEventListener("click", () => shopPanel.classList.add("hidden"));

const SHOP_STOCK = [
  { id: "potion_hp", name: "Tiểu Hoàn Đan (hồi máu)", price: 10 },
  { id: "potion_mp", name: "Nội Lực Đan (hồi nội lực)", price: 12 },
  { id: "sword", name: "Thiết Kiếm (+ sát thương)", price: 100 },
];

export function openShop(onBuy) {
  shopItemsEl.innerHTML = "";
  for (const item of SHOP_STOCK) {
    const row = document.createElement("div");
    row.className = "shop-item";
    row.innerHTML = `<span>${item.name} - ${item.price} lượng</span>`;
    const btn = document.createElement("button");
    btn.textContent = "Mua";
    btn.addEventListener("click", () => onBuy(item));
    row.appendChild(btn);
    shopItemsEl.appendChild(row);
  }
  shopPanel.classList.remove("hidden");
}

export function isShopOpen() {
  return !shopPanel.classList.contains("hidden");
}
