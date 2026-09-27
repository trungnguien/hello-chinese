import { chatBrains } from '../chat/brains.js';
import { personalities } from '../chat/personalities.js';
import { createFacts } from '../chat/facts.js';

/**
 * Kỹ năng TÁN GẪU. Bot nói chuyện dựa trên sự kiện nghiệp vụ (nguyên tắc 4):
 *   game.started  -> chào hỏi
 *   game.moved    -> bình luận khi ăn quân / mất quân / chiếu / bị chiếu
 *   game.ended    -> chúc mừng / tiếc nuối
 *   draw.offered  -> giải thích khi từ chối hoà
 *   chat.posted   -> trả lời tin nhắn của người chơi
 * và nói qua ĐÚNG use case người thật dùng: services.games.chat.
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
  const colorIn = (session) => session.colorOf(player.id);

  function say(session, produce, { isReply = false } = {}) {
    const state = stateOf(session.id);
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
        await services.games.chat({ player, gameId: session.id, text });
      } catch (err) {
        console.error(`[bot-chat] ${player.id}:`, err.message);
      }
    }, min + random() * (max - min));
    timers.add(handle);
  }

  const comment = (session, event, extra) =>
    say(session, () =>
      brain.comment({ event, personality, facts: createFacts({ session, bot: player, extra }), random }),
    );

  const offs = [
    bus.on('game.started', ({ session }) => {
      if (colorIn(session)) comment(session, 'greet');
    }),

    bus.on('game.moved', ({ session, record }) => {
      const mine = colorIn(session);
      if (!mine || record.san.endsWith('#')) return; // chiếu hết -> để game.ended nói
      const byBot = record.color === mine;
      if (record.check) comment(session, byBot ? 'botGivesCheck' : 'botInCheck');
      else if (record.captured) {
        comment(session, byBot ? 'botCaptured' : 'botLostPiece', { pieceType: record.captured });
      }
    }),

    bus.on('game.ended', ({ session, result }) => {
      const mine = colorIn(session);
      if (!mine) return;
      stateOf(session.id).lastCommentAt = -Infinity; // lời cuối ván luôn được nói
      comment(session, result.winner === null ? 'draw' : result.winner === mine ? 'win' : 'lose');
    }),

    bus.on('draw.offered', ({ session, by }) => {
      const mine = colorIn(session);
      if (mine && by !== mine) comment(session, 'drawDeclined');
    }),

    bus.on('chat.posted', ({ session, from, text }) => {
      if (!colorIn(session) || from.id === player.id) return;
      // Không trả lời bot khác -> tránh hai bot nói chuyện với nhau vô hạn.
      const sender = Object.values(session.players).find((p) => p?.id === from.id);
      if (sender?.isBot) return;
      say(
        session,
        () => brain.reply({ text, personality, facts: createFacts({ session, bot: player }), random }),
        { isReply: true },
      );
    }),

    bus.on('game.removed', ({ session }) => memory.delete(session.id)),
  ];

  return () => {
    offs.forEach((off) => off());
    timers.forEach((h) => scheduler.clearTimeout(h));
  };
}
