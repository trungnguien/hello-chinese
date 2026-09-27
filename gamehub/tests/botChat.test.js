import { test } from 'node:test';
import assert from 'node:assert/strict';
import { botSkills } from '../server/bots/skills/index.js';
import { chatBrains, normalize, fillTemplate } from '../server/bots/chat/brains.js';
import { createRooms } from './helpers.js';

/** Scheduler thủ công: flush() chạy mọi hẹn giờ đang chờ. */
function manualScheduler() {
  let timers = [];
  return {
    setTimeout: (fn) => (timers.push(fn), fn),
    clearTimeout: (fn) => (timers = timers.filter((t) => t !== fn)),
    async flush() {
      while (timers.length) {
        const due = timers;
        timers = [];
        for (const fn of due) await fn();
        await new Promise((r) => setImmediate(r));
      }
    },
  };
}

async function setup({ personality = 'friendly', random = () => 0, cooldownMs = 0, gameId = 'chess' } = {}) {
  const { bus, rooms } = createRooms();
  const chats = [];
  bus.on('chat.posted', (e) => chats.push(e));
  const bot = { id: 'bot:test', name: 'Bot Thử', isBot: true };
  const human = { id: 'u1', name: 'Trung' };
  const scheduler = manualScheduler();
  let clock = 0;
  const teardown = botSkills.get('chat')({
    bus,
    services: { rooms },
    player: bot,
    scheduler,
    random,
    now: () => clock,
    options: { personality, cooldownMs },
  });
  const room = await rooms.create({ player: human, gameId, seat: gameId === 'chess' ? 'w' : 'x' });
  await rooms.join({ player: bot, roomId: room.id });
  await scheduler.flush();
  const botLines = () => chats.filter((c) => c.from.id === bot.id).map((c) => c.text);
  const say = async (text) => {
    await rooms.chat({ player: human, roomId: room.id, text });
    await scheduler.flush();
  };
  const act = (player, action) => rooms.act({ player, roomId: room.id, action });
  return { bus, rooms, bot, human, room, scheduler, chats, botLines, say, act, teardown, tick: (ms) => (clock += ms) };
}

test('bot chào khi ván bắt đầu, có điền tên đối thủ', async () => {
  const { botLines } = await setup();
  assert.equal(botLines().length, 1);
  assert.match(botLines()[0], /Trung/);
});

test('bot trả lời theo luật: chào, tên, đánh giá thế cờ, gợi ý', async () => {
  const { botLines, say } = await setup();
  await say('Xin chào bạn!');
  assert.match(botLines().at(-1), /Chào Trung/);
  await say('bạn tên là gì?');
  assert.match(botLines().at(-1), /Bot Thử/);
  await say('Ai đang thắng vậy?');
  assert.match(botLines().at(-1), /cân bằng/);
  await say('gợi ý cho mình nước đi đi');
  assert.match(botLines().at(-1), /[a-h][1-8]|[NBRQK]/, 'gợi ý là một nước đi SAN');
});

test('không khớp luật -> dùng câu fallback; gợi ý khi chưa tới lượt người chơi -> bỏ qua mẫu thiếu fact', async () => {
  const { botLines, say, act, human } = await setup();
  await say('trời hôm nay đẹp nhỉ');
  assert.match(botLines().at(-1), /tập trung/);
  await act(human, { uci: 'e2e4' }); // giờ là lượt bot
  await say('gợi ý đi');
  assert.doesNotMatch(botLines().at(-1), /\{hint\}|undefined/);
});

test('bình luận khi ăn quân / chiếu và khi ván kết thúc', async () => {
  const { botLines, act, human, bot, scheduler } = await setup();
  for (const [who, uci] of [[human, 'f2f3'], [bot, 'e7e5'], [human, 'g2g4'], [bot, 'd8h4']]) await act(who, { uci });
  await new Promise((r) => setImmediate(r));
  await scheduler.flush();
  assert.match(botLines().at(-1), /Ván hay|GG/, 'bot thắng thì nói câu "win"');
});

test('không tự trả lời chính mình, không nói chuyện với bot khác, tôn trọng cooldown', async () => {
  const ctx = await setup({ cooldownMs: 10_000 });
  const before = ctx.botLines().length;
  await ctx.rooms.chat({ player: ctx.bot, roomId: ctx.room.id, text: 'xin chào' });
  await ctx.scheduler.flush();
  assert.equal(ctx.botLines().length, before + 1, 'chỉ có tin bot tự gửi, không có trả lời');

  // Trong thời gian cooldown, bị chiếu không làm bot bình luận thêm.
  ctx.bus.emit('room.acted', { room: ctx.room, seat: 'w', text: 'Qh5+', notes: [{ kind: 'check' }] });
  await ctx.scheduler.flush();
  assert.equal(ctx.botLines().length, before + 1);
  ctx.tick(10_001);
  ctx.bus.emit('room.acted', { room: ctx.room, seat: 'w', text: 'Qh5+', notes: [{ kind: 'check' }] });
  await ctx.scheduler.flush();
  assert.equal(ctx.botLines().length, before + 2);
  ctx.teardown();
});

test('cùng kỹ năng chat dùng được cho Caro: fact riêng của game + note "threat"', async () => {
  const { botLines, say, act, human, bot, scheduler } = await setup({ gameId: 'caro' });
  assert.match(botLines()[0], /Trung/);
  await say('bạn tên là gì?');
  assert.match(botLines().at(-1), /Cờ Caro/);
  await say('ai đang thắng?');
  assert.match(botLines().at(-1), /ô trống|ô thắng/);
  await say('gợi ý đi');
  assert.match(botLines().at(-1), /[A-O]\d+/, 'gợi ý là toạ độ caro');
  // X đe doạ: bot (O) bị đe doạ -> botThreatened
  for (const [p, row, col] of [[human, 7, 3], [bot, 0, 0], [human, 7, 4], [bot, 0, 1], [human, 7, 5], [bot, 0, 3], [human, 7, 6]]) {
    await act(p, { row, col });
  }
  await scheduler.flush();
  assert.match(botLines().at(-1), /chặn|ghê/, 'bot phản ứng khi bị đe doạ');
});

test('tính cách là dữ liệu: bot "proud" nói khác bot "friendly"', async () => {
  const proud = await setup({ personality: 'proud' });
  await proud.say('xin chào');
  assert.match(proud.botLines().at(-1), /Tập trung vào bàn cờ/);
});

test('brain và tiện ích: bỏ dấu, điền mẫu, thiếu fact trả null', () => {
  assert.equal(normalize('  Xin CHÀO, Đẹp  quá '), 'xin chao, dep qua');
  assert.equal(fillTemplate('Chào {x}', { x: () => 'bạn' }), 'Chào bạn');
  assert.equal(fillTemplate('Chào {x}', { x: () => undefined }), null);
  assert.ok(chatBrains.has('rules'));
});
