import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../shared/core/EventBus.js';
import { Registry } from '../shared/core/Registry.js';
import { buildVariant, variantDefinitions } from '../shared/engine/index.js';
import { timeControlKinds } from '../shared/time/index.js';
import { GameService } from '../server/app/GameService.js';
import { createMemoryRepository } from '../server/adapters/storage/memory.js';
import { botSkills } from '../server/bots/skills/index.js';
import { chatBrains, normalize, fillTemplate } from '../server/bots/chat/brains.js';

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

async function setup({ personality = 'friendly', random = () => 0, cooldownMs = 0 } = {}) {
  const bus = new EventBus();
  const chats = [];
  bus.on('chat.posted', (e) => chats.push(e));
  const games = new GameService({
    repository: createMemoryRepository(),
    variants: new Registry('v').register('standard', buildVariant(variantDefinitions.get('standard'))),
    timeControls: new Registry('tc').register('untimed', { id: 'untimed', label: '∞', kind: 'untimed' }),
    clockKinds: timeControlKinds,
    bus,
  });
  const bot = { id: 'bot:test', name: 'Bot Thử', isBot: true };
  const human = { id: 'u1', name: 'Trung' };
  const scheduler = manualScheduler();
  let clock = 0;
  const teardown = botSkills.get('chat')({
    bus,
    services: { games },
    player: bot,
    scheduler,
    random,
    now: () => clock,
    options: { personality, cooldownMs },
  });
  const session = await games.create({ player: human, variantId: 'standard', timeControlId: 'untimed', color: 'w' });
  await games.join({ player: bot, gameId: session.id });
  await scheduler.flush();
  const botLines = () => chats.filter((c) => c.from.id === bot.id).map((c) => c.text);
  const say = async (text) => {
    await games.chat({ player: human, gameId: session.id, text });
    await scheduler.flush();
  };
  return { bus, games, bot, human, session, scheduler, chats, botLines, say, teardown, tick: (ms) => (clock += ms) };
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
  const { botLines, say, games, human, session } = await setup();
  await say('trời hôm nay đẹp nhỉ');
  assert.match(botLines().at(-1), /tập trung/);
  await games.move({ player: human, gameId: session.id, uci: 'e2e4' }); // giờ là lượt bot
  await say('gợi ý đi');
  assert.doesNotMatch(botLines().at(-1), /\{hint\}|undefined/);
});

test('bình luận khi ăn quân / chiếu và khi ván kết thúc', async () => {
  const { botLines, games, human, bot, session, scheduler } = await setup();
  for (const [who, uci] of [[human, 'f2f3'], [bot, 'e7e5'], [human, 'g2g4'], [bot, 'd8h4']]) {
    await games.move({ player: who, gameId: session.id, uci });
  }
  await new Promise((r) => setImmediate(r));
  await scheduler.flush();
  assert.match(botLines().at(-1), /Ván hay|GG/, 'bot thắng thì nói câu "win"');
});

test('không tự trả lời chính mình, không nói chuyện với bot khác, tôn trọng cooldown', async () => {
  const ctx = await setup({ cooldownMs: 10_000 });
  const before = ctx.botLines().length;
  await ctx.games.chat({ player: ctx.bot, gameId: ctx.session.id, text: 'xin chào' });
  await ctx.scheduler.flush();
  assert.equal(ctx.botLines().length, before + 1, 'chỉ có tin bot tự gửi, không có trả lời');

  // Trong thời gian cooldown, bị chiếu không làm bot bình luận thêm.
  ctx.bus.emit('game.moved', { session: ctx.session, record: { color: 'w', san: 'Qh5+', check: true, captured: null } });
  await ctx.scheduler.flush();
  assert.equal(ctx.botLines().length, before + 1);
  ctx.tick(10_001);
  ctx.bus.emit('game.moved', { session: ctx.session, record: { color: 'w', san: 'Qh5+', check: true, captured: null } });
  await ctx.scheduler.flush();
  assert.equal(ctx.botLines().length, before + 2);
  ctx.teardown();
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
