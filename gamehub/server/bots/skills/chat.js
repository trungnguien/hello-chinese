import { chatBrains } from '../chat/brains.js';
import { personalities } from '../chat/personalities.js';
import { createFacts } from '../chat/facts.js';

/**
 * Module game gắn "notes" vào hành động (capture, check, threat...). Bảng DỮ LIỆU dưới đây
 * ánh xạ note -> sự kiện lời thoại [khi bot làm, khi đối thủ làm]; ưu tiên theo thứ tự.
 */
const NOTE_EVENTS = {
  check: ['botGivesCheck', 'botInCheck'],
  threat: ['botThreat', 'botThreatened'],
  capture: ['botCaptured', 'botLostPiece'],
};
const NOTE_PRIORITY = Object.keys(NOTE_EVENTS);

/**
 * Kỹ năng TÁN GẪU. Bot nói chuyện dựa trên sự kiện nghiệp vụ (nguyên tắc 4):
 *   room.started  -> chào hỏi
 *   room.acted    -> bình luận theo "notes" của module (ăn quân, chiếu, đe doạ...)
 *   room.ended    -> chúc mừng / tiếc nuối
 *   draw.offered  -> giải thích khi từ chối hoà
 *   chat.posted   -> trả lời tin nhắn của người chơi
 * và nói qua ĐÚNG use case người thật dùng: services.rooms.chat.
 *
 * options:
 *   personality : id trong personalities (mặc định 'friendly')
 *   brain       : id trong chatBrains (mặc định 'rules') — late binding
 *   delayMs     : [min, max] thời gian "gõ phím" trước khi nói
 *   cooldownMs  : khoảng cách tối thiểu giữa hai lời bình luận tự phát
 *   maxPerGame  : số tin nhắn tối đa trong một ván (chống spam)
 */
export default function chatSkill({
  bus,
  services,
  player,
  scheduler,
  random = Math.random,
  now = () => Date.now(),
  options = {},
}) {
  const {
    personality: personalityId = 'friendly',
    brain: brainId = 'rules',
    delayMs = [700, 1800],
    cooldownMs = 4000,
    maxPerGame = 40,
  } = options;
  const personality = personalities[personalityId];
  if (!personality) throw new Error(`Unknown chat personality "${personalityId}"`);
  const brain = chatBrains.get(brainId);

  /** gameId -> { lastCommentAt, sent, pendingReply } */
  const memory = new Map();
  const timers = new Set();
  const stateOf = (id) => {
    if (!memory.has(id)) memory.set(id, { lastCommentAt: -Infinity, sent: 0, pendingReply: false });
    return memory.get(id);
  };
  const seatIn = (room) => room.seatOf(player.id);

  function say(room, produce, { isReply = false } = {}) {
    const state = stateOf(room.id);
    if (state.sent >= maxPerGame) return;
    if (isReply) {
      if (state.pendingReply) return;
      state.pendingReply = true;
    } else {
      const at = now();
      if (at - state.lastCommentAt < cooldownMs) return;
      state.lastCommentAt = at;
    }
    const [min, max] = delayMs;
    const handle = scheduler.setTimeout(async () => {
      timers.delete(handle);
      if (isReply) state.pendingReply = false;
      try {
        const text = await produce();
        if (!text) return;
        state.sent += 1;
        await services.rooms.chat({ player, roomId: room.id, text });
      } catch (err) {
        console.error(`[bot-chat] ${player.id}:`, err.message);
      }
    }, min + random() * (max - min));
    timers.add(handle);
  }

  const comment = (room, event, extra) =>
    say(room, () => brain.comment({ event, personality, facts: createFacts({ room, bot: player, extra }), random }));

  const offs = [
    bus.on('room.started', ({ room }) => {
      if (seatIn(room)) comment(room, 'greet');
    }),

    bus.on('room.acted', ({ room, seat, notes }) => {
      const mine = seatIn(room);
      if (!mine || room.match.outcome()) return; // hành động kết thúc ván -> để room.ended nói
      const byBot = seat === mine;
      for (const kind of NOTE_PRIORITY) {
        const note = notes.find((n) => n.kind === kind);
        if (!note) continue;
        const [ifBot, ifOpponent] = NOTE_EVENTS[kind];
        comment(room, byBot ? ifBot : ifOpponent, { label: note.label });
        break;
      }
    }),

    bus.on('room.ended', ({ room, result }) => {
      const mine = seatIn(room);
      if (!mine) return;
      stateOf(room.id).lastCommentAt = -Infinity; // lời cuối ván luôn được nói
      comment(room, result.winners.length === 0 ? 'draw' : result.winners.includes(mine) ? 'win' : 'lose');
    }),

    bus.on('draw.offered', ({ room, by }) => {
      const mine = seatIn(room);
      if (mine && by !== mine) comment(room, 'drawDeclined');
    }),

    bus.on('chat.posted', ({ room, from, text }) => {
      if (!seatIn(room) || from.id === player.id) return;
      // Không trả lời bot khác -> tránh hai bot nói chuyện với nhau vô hạn.
      const sender = Object.values(room.players).find((p) => p?.id === from.id);
      if (sender?.isBot) return;
      say(room, () => brain.reply({ text, personality, facts: createFacts({ room, bot: player }), random }), {
        isReply: true,
      });
    }),

    bus.on('room.removed', ({ room }) => memory.delete(room.id)),
  ];

  return () => {
    offs.forEach((off) => off());
    timers.forEach((h) => scheduler.clearTimeout(h));
  };
}
