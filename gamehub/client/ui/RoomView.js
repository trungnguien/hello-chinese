import { h, clear, setChildren } from '/shared/dom.js';
import { loadGameClient } from '../games/loader.js';

export function formatClock(ms) {
  if (ms === null || ms === undefined) return '';
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  return total < 10000 ? `${m}:${String(s).padStart(2, '0')}.${tenths}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** Thời gian còn lại hiển thị = giá trị server gửi trừ thời gian trôi qua kể từ khi nhận. */
export function displayedMs(room, seat, now = performance.now()) {
  if (!room.clock) return null;
  const base = room.clock.remaining[seat];
  return room.status === 'active' && room.clock.running === seat ? base - (now - room.receivedAt) : base;
}

/**
 * Khung PHÒNG CHƠI dùng cho mọi game: ghế người chơi, đồng hồ, trạng thái, nút,
 * nhật ký, chat. Vùng "sân khấu" ở giữa do module game tự vẽ qua mount()/update().
 */
export class RoomView {
  constructor({ bus, texts }) {
    this.bus = bus;
    this.texts = texts;
    this.topBars = h('div', { class: 'seat-bars' });
    this.bottomBars = h('div', { class: 'seat-bars' });
    this.stage = h('div', { class: 'stage' });
    this.status = h('div', { class: 'status' });
    this.banner = h('div', { class: 'banner' });
    this.actions = h('div', { class: 'actions' });
    this.log = h('ol', { class: 'log' });
    this.chatLog = h('div', { class: 'chat-log' });
    this.chatInput = h('input', { type: 'text', maxlength: 300, placeholder: 'Nhắn tin…' });
    this.room = null;
    this.bars = [];
    this.chatKey = null;
    this.mounted = null; // { gameId, instance }
    this.mounting = null;

    this.el = h(
      'section',
      { class: 'room' },
      h('div', { class: 'stage-column' }, this.topBars, this.stage, this.bottomBars),
      h(
        'aside',
        { class: 'side-column' },
        h('div', { class: 'card' }, this.status, this.banner, this.actions),
        h('div', { class: 'card log-card' }, h('h3', {}, 'Diễn biến'), this.log),
        h(
          'form',
          {
            class: 'card chat',
            onsubmit: (e) => {
              e.preventDefault();
              if (!this.chatInput.value.trim()) return;
              this.bus.emit('intent.chat', { text: this.chatInput.value });
              this.chatInput.value = '';
            },
          },
          h('h3', {}, 'Trò chuyện'),
          this.chatLog,
          h('div', { class: 'row' }, this.chatInput, h('button', { type: 'submit' }, 'Gửi')),
        ),
      ),
    );
    this.ticker = setInterval(() => this.#renderClocks(), 100);
  }

  render(state) {
    const room = state.rooms[state.route.roomId];
    this.room = room;
    const manifest = state.catalog.games.find((g) => g.id === (room?.game.id ?? state.route.gameId));
    this.manifest = manifest;
    if (!room || !manifest) {
      setChildren(this.status, 'Đang tải phòng…');
      return;
    }
    this.flipped = Boolean(state.ui.flipped && room.capabilities?.flip);
    this.#renderStage(room, manifest, state.ui);
    this.#renderSeats(room);
    this.#renderClocks();
    this.#renderStatus(room, manifest);
    this.#renderActions(room);
    this.#renderLog(room);
    this.#renderChat(room, state.chat[room.id] ?? []);
  }

  /** Nạp và gắn module game (một lần cho mỗi game), sau đó chỉ gọi update(). */
  #renderStage(room, manifest, ui) {
    const ctx = {
      you: room.you,
      active: room.you !== null && room.active.includes(room.you),
      status: room.status,
      flipped: ui.flipped,
    };
    if (this.mounted?.gameId === manifest.id) {
      this.mounted.instance.update(room.view, ctx);
      return;
    }
    if (this.mounting === manifest.id) return;
    this.mounted?.instance.unmount();
    this.mounted = null;
    this.mounting = manifest.id;
    clear(this.stage).append(h('p', { class: 'meta' }, `Đang tải ${manifest.name}…`));
    loadGameClient(manifest)
      .then((mod) => {
        if (this.mounting !== manifest.id) return;
        clear(this.stage);
        const api = { sendAction: (action) => this.bus.emit('intent.action', { action }) };
        this.mounted = { gameId: manifest.id, instance: mod.mount(this.stage, api) };
        this.mounting = null;
        if (this.room) this.#renderStage(this.room, manifest, ui);
      })
      .catch((err) => {
        this.mounting = null;
        setChildren(this.stage, h('p', { class: 'error' }, `Không nạp được ${manifest.name}: ${err.message}`));
      });
  }

  #renderSeats(room) {
    // Ghế của bạn ở dưới, các ghế khác ở trên (đúng cho 2 hay N người).
    const base = room.you ?? room.seats[0].id;
    const mine = room.seats.filter((s) => s.id === base);
    const others = room.seats.filter((s) => s.id !== base);
    const [top, bottom] = this.flipped ? [mine, others] : [others, mine];
    this.bars = [];
    const bar = (seat) => {
      const clock = h('div', { class: 'clock' });
      const el = h(
        'div',
        {
          class: [
            'player-bar',
            room.active.includes(seat.id) ? 'to-move' : '',
            room.result?.winners.includes(seat.id) ? 'winner' : '',
          ].join(' '),
        },
        h(
          'div',
          { class: 'player-name' },
          h('span', { class: `seat-chip seat-${seat.id}` }, seat.label),
          seat.player ? seat.player.name : 'Đang chờ…',
          seat.player?.isBot ? h('span', { class: 'tag' }, 'BOT') : null,
          room.you === seat.id ? h('span', { class: 'tag you' }, 'Bạn') : null,
        ),
        clock,
      );
      this.bars.push({ seat: seat.id, clock });
      return el;
    };
    this.topBars.replaceChildren(...top.map(bar));
    this.bottomBars.replaceChildren(...bottom.map(bar));
  }

  #renderClocks() {
    const room = this.room;
    if (!room) return;
    for (const { seat, clock } of this.bars) {
      const ms = displayedMs(room, seat);
      clock.textContent = formatClock(ms);
      clock.hidden = ms === null;
      clock.classList.toggle('running', room.status === 'active' && room.clock?.running === seat);
      clock.classList.toggle('low', ms !== null && ms < 20000);
    }
  }

  #seatLabels(room, ids) {
    return ids.map((id) => room.seats.find((s) => s.id === id)?.label ?? id).join(', ');
  }

  #renderStatus(room, manifest) {
    const t = this.texts;
    let text;
    if (room.result) {
      const who = room.result.winners.length ? `${this.#seatLabels(room, room.result.winners)} thắng` : 'Hoà';
      text = [h('strong', {}, who), h('div', { class: 'meta' }, t.reason(room.result.reason, manifest))];
    } else if (room.status === 'waiting') {
      text = [
        h('strong', {}, t.status.waiting),
        h('div', { class: 'meta' }, 'Gửi đường dẫn này cho bạn bè:'),
        h('input', { class: 'share', readonly: true, value: location.href, onclick: (e) => e.target.select() }),
      ];
    } else if (room.you) {
      text = h('strong', {}, room.active.includes(room.you) ? t.status.yourTurn : t.status.theirTurn);
    } else {
      text = h('strong', {}, t.status.turnOf(this.#seatLabels(room, room.active)));
    }
    const meta = [room.game.name, room.summary, room.timeControl?.label, room.spectators ? `${room.spectators} người xem` : null];
    setChildren(this.status, text, h('div', { class: 'meta' }, meta.filter(Boolean).join(' · ')));

    clear(this.banner);
    if (room.status === 'active' && room.you && room.drawOffer && room.drawOffer !== room.you) {
      this.banner.append(
        h('span', {}, t.notices.draw_offered),
        h('button', { class: 'primary', onclick: () => this.bus.emit('intent.respondDraw', { accept: true }) }, 'Đồng ý'),
        h('button', { onclick: () => this.bus.emit('intent.respondDraw', { accept: false }) }, 'Từ chối'),
      );
    } else if (room.status === 'active' && room.you && room.drawOffer === room.you) {
      this.banner.append(h('span', { class: 'meta' }, 'Đã gửi lời mời hoà…'));
    }
  }

  #renderActions(room) {
    const btn = (label, intent, extra = {}) => h('button', { onclick: () => this.bus.emit(intent, {}), ...extra }, label);
    const caps = room.capabilities ?? {};
    const items = [];
    if (room.you && room.status === 'active') {
      items.push(btn('🏳 Đầu hàng', 'intent.resign'));
      if (caps.drawOffers) items.push(btn('½ Mời hoà', 'intent.offerDraw', { disabled: room.drawOffer === room.you }));
    }
    if (room.you && room.status === 'waiting') items.push(btn('Huỷ phòng', 'intent.cancel'));
    if (!room.you && room.status === 'waiting') items.push(btn('Vào chơi', 'intent.joinCurrent', { class: 'primary' }));
    if (caps.flip) items.push(btn('⇅ Lật bàn', 'intent.flip'));
    items.push(btn('← Sảnh', 'intent.back'));
    setChildren(this.actions, ...items);
  }

  #renderLog(room) {
    clear(this.log);
    const perRound = room.seats.length;
    for (let i = 0; i < room.log.length; i += perRound) {
      const cells = room.log
        .slice(i, i + perRound)
        .map((e, k) => h('span', { class: `entry${i + k === room.log.length - 1 ? ' last' : ''}` }, e.text));
      this.log.append(h('li', { style: `--cols:${perRound}` }, h('span', { class: 'num' }, `${i / perRound + 1}.`), cells));
    }
    this.log.scrollTop = this.log.scrollHeight;
  }

  #renderChat(room, messages) {
    const key = `${room.id}:${messages.length}`;
    if (key === this.chatKey) return;
    this.chatKey = key;
    clear(this.chatLog);
    const bots = new Set(room.seats.filter((s) => s.player?.isBot).map((s) => s.player.id));
    for (const m of messages) {
      const isBot = bots.has(m.from.id);
      this.chatLog.append(
        h('div', { class: `chat-line${isBot ? ' bot' : ''}` }, isBot ? '🤖 ' : null, h('strong', {}, m.from.name + ': '), m.text),
      );
    }
    if (!messages.length) this.chatLog.append(h('div', { class: 'meta' }, 'Chưa có tin nhắn.'));
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }
}
