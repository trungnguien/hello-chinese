import { h, clear, setChildren } from './dom.js';
import { BoardView } from './BoardView.js';

const opposite = (c) => (c === 'w' ? 'b' : 'w');

export function formatClock(ms) {
  if (ms === null || ms === undefined) return '';
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  return total < 10000 ? `${m}:${String(s).padStart(2, '0')}.${tenths}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** Thời gian còn lại hiển thị = giá trị server gửi trừ thời gian trôi qua kể từ khi nhận. */
export function displayedMs(game, color, now = performance.now()) {
  if (!game.clock) return null;
  const base = game.clock[color];
  return game.status === 'active' && game.clock.running === color ? base - (now - game.receivedAt) : base;
}

/**
 * Màn hình ván cờ: bàn cờ + đồng hồ + nước đi + chat.
 * Chỉ đọc state và phát intent — không gọi mạng trực tiếp.
 */
export class GameView {
  constructor({ bus, pieceSet, texts }) {
    this.bus = bus;
    this.texts = texts;
    this.board = new BoardView({ bus, pieceSet });
    this.bars = { top: playerBar(), bottom: playerBar() };
    this.status = h('div', { class: 'status' });
    this.banner = h('div', { class: 'banner' });
    this.actions = h('div', { class: 'actions' });
    this.moves = h('ol', { class: 'moves' });
    this.chatLog = h('div', { class: 'chat-log' });
    this.chatInput = h('input', { type: 'text', maxlength: 300, placeholder: 'Nhắn tin…' });
    this.game = null;
    this.chatKey = null;

    this.el = h(
      'section',
      { class: 'game' },
      h('div', { class: 'board-column' }, this.bars.top.el, this.board.el, this.bars.bottom.el),
      h(
        'aside',
        { class: 'side-column' },
        h('div', { class: 'card' }, this.status, this.banner, this.actions),
        h('div', { class: 'card moves-card' }, h('h3', {}, 'Nước đi'), this.moves),
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
    const game = state.games[state.route.gameId];
    this.game = game;
    if (!game) {
      setChildren(this.status, 'Đang tải ván cờ…');
      return;
    }
    const base = game.you ?? 'w';
    const orientation = state.ui.flipped ? opposite(base) : base;
    this.orientation = orientation;
    this.board.render({
      fen: game.fen,
      orientation,
      lastMove: game.lastMove,
      check: game.check,
      turn: game.turn,
      legalMoves: game.legalMoves,
    });
    this.#renderBar(this.bars.top, game, opposite(orientation));
    this.#renderBar(this.bars.bottom, game, orientation);
    this.#renderClocks();
    this.#renderStatus(game);
    this.#renderActions(game);
    this.#renderMoves(game);
    this.#renderChat(game.id, state.chat[game.id] ?? []);
  }

  #renderBar(bar, game, color) {
    const p = game.players[color];
    bar.color = color;
    bar.el.classList.toggle('to-move', game.status === 'active' && game.turn === color);
    bar.el.classList.toggle('winner', game.result?.winner === color);
    setChildren(bar.name,
      h('span', { class: `dot ${color}` }),
      p ? p.name : 'Đang chờ…',
      p?.isBot ? h('span', { class: 'tag' }, 'BOT') : null,
      game.you === color ? h('span', { class: 'tag you' }, 'Bạn') : null,
    );
  }

  #renderClocks() {
    const game = this.game;
    if (!game) return;
    for (const bar of Object.values(this.bars)) {
      const ms = displayedMs(game, bar.color);
      bar.clock.textContent = formatClock(ms);
      bar.clock.hidden = ms === null;
      bar.clock.classList.toggle('running', game.status === 'active' && game.clock?.running === bar.color);
      bar.clock.classList.toggle('low', ms !== null && ms < 20000);
    }
  }

  #renderStatus(game) {
    const t = this.texts;
    let text;
    if (game.result) {
      const who = game.result.winner ? `${t.colors[game.result.winner]} thắng` : 'Hoà';
      text = [h('strong', {}, `${game.result.score} · ${who}`), h('div', { class: 'meta' }, t.reason(game.result.reason))];
    } else if (game.status === 'waiting') {
      text = [
        h('strong', {}, t.status.waiting),
        h('div', { class: 'meta' }, 'Gửi đường dẫn này cho bạn bè:'),
        h('input', { class: 'share', readonly: true, value: location.href, onclick: (e) => e.target.select() }),
      ];
    } else if (game.you) {
      text = h('strong', {}, game.turn === game.you ? t.status.yourTurn : t.status.theirTurn);
    } else {
      text = h('strong', {}, t.status.turnOf(game.turn));
    }
    setChildren(this.status,
      ...[text].flat(),
      h('div', { class: 'meta' }, `${game.variant.name} · ${game.timeControl.label}${game.spectators ? ` · ${game.spectators} người xem` : ''}`),
    );

    clear(this.banner);
    if (game.status === 'active' && game.you && game.drawOffer === opposite(game.you)) {
      this.banner.append(
        h('span', {}, this.texts.notices.draw_offered),
        h('button', { class: 'primary', onclick: () => this.bus.emit('intent.respondDraw', { accept: true }) }, 'Đồng ý'),
        h('button', { onclick: () => this.bus.emit('intent.respondDraw', { accept: false }) }, 'Từ chối'),
      );
    } else if (game.status === 'active' && game.you && game.drawOffer === game.you) {
      this.banner.append(h('span', { class: 'meta' }, 'Đã gửi lời mời hoà…'));
    }
  }

  #renderActions(game) {
    const btn = (label, intent, extra = {}) => h('button', { onclick: () => this.bus.emit(intent, {}), ...extra }, label);
    const items = [];
    if (game.you && game.status === 'active') {
      items.push(btn('🏳 Đầu hàng', 'intent.resign'));
      items.push(btn('½ Mời hoà', 'intent.offerDraw', { disabled: game.drawOffer === game.you }));
    }
    if (game.you && game.status === 'waiting') items.push(btn('Huỷ phòng', 'intent.cancel'));
    if (!game.you && game.status === 'waiting') items.push(btn('Vào chơi', 'intent.joinCurrent', { class: 'primary' }));
    items.push(btn('⇅ Lật bàn', 'intent.flip'));
    items.push(btn('← Sảnh', 'intent.lobby'));
    setChildren(this.actions, ...items);
  }

  #renderMoves(game) {
    clear(this.moves);
    for (let i = 0; i < game.moves.length; i += 2) {
      const cell = (m, idx) =>
        m ? h('span', { class: `san${idx === game.moves.length - 1 ? ' last' : ''}` }, m.san) : h('span', { class: 'san' });
      this.moves.append(h('li', {}, h('span', { class: 'num' }, `${i / 2 + 1}.`), cell(game.moves[i], i), cell(game.moves[i + 1], i + 1)));
    }
    this.moves.scrollTop = this.moves.scrollHeight;
  }

  #renderChat(gameId, messages) {
    const key = `${gameId}:${messages.length}`;
    if (key === this.chatKey) return;
    this.chatKey = key;
    clear(this.chatLog);
    for (const m of messages) this.chatLog.append(h('div', { class: 'chat-line' }, h('strong', {}, m.from.name + ': '), m.text));
    if (!messages.length) this.chatLog.append(h('div', { class: 'meta' }, 'Chưa có tin nhắn.'));
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }
}

function playerBar() {
  const name = h('div', { class: 'player-name' });
  const clock = h('div', { class: 'clock' });
  return { el: h('div', { class: 'player-bar' }, name, clock), name, clock, color: 'w' };
}
