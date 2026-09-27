import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { createApp } from '../server/bootstrap.js';
import baseConfig from '../config/default.js';

let app;
let port;
let archiveDir;
const quiet = { log() {}, error: console.error };

before(async () => {
  archiveDir = await mkdtemp(path.join(os.tmpdir(), 'chess-'));
  const config = {
    ...baseConfig,
    plugins: baseConfig.plugins
      .filter((p) => !p.module.includes('logger'))
      .map((p) => (p.module.includes('bots') ? { ...p, options: { ...p.options, thinkMs: 5 } } : p))
      .map((p) => (p.module.includes('archive') ? { ...p, options: { dir: archiveDir } } : p)),
  };
  app = await createApp(config, { logger: quiet });
  ({ port } = await app.listen(0, '127.0.0.1'));
});

after(async () => {
  await app.close();
  await rm(archiveDir, { recursive: true, force: true });
});

/** Client kiểm thử nói đúng contract. */
async function client(name) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await new Promise((r) => ws.once('open', r));
  const inbox = [];
  const waiters = [];
  let nextId = 1;
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const waiter = waiters.find((w) => w.match(msg));
    if (!waiter) return inbox.push(msg);
    waiters.splice(waiters.indexOf(waiter), 1);
    waiter.resolve(msg);
  });
  const c = {
    ws,
    inbox,
    waitFor(match, ms = 2000) {
      const found = inbox.find(match);
      if (found) {
        inbox.splice(inbox.indexOf(found), 1);
        return Promise.resolve(found);
      }
      return new Promise((resolve, reject) => {
        const w = { match, resolve };
        waiters.push(w);
        setTimeout(() => reject(new Error('timeout waiting for message')), ms);
      });
    },
    async request(type, payload) {
      const id = nextId++;
      ws.send(JSON.stringify({ v: 2, type, id, payload }));
      const reply = await c.waitFor((m) => m.replyTo === id);
      if (reply.type === 'error') throw Object.assign(new Error(reply.payload.message), { code: reply.payload.code });
      return reply.payload;
    },
    state: (roomId, pred = () => true) =>
      c.waitFor((m) => m.type === 'room.state' && m.payload.id === roomId && pred(m.payload)).then((m) => m.payload),
  };
  await c.request('hello', { name });
  return c;
}

test('HTTP: phục vụ vỏ client, shared, client của từng game; giấu mã server của module', async () => {
  const base = `http://127.0.0.1:${port}`;
  assert.match(await (await fetch(`${base}/`)).text(), /GameHub/);
  assert.equal((await fetch(`${base}/shared/protocol/contract.js`)).status, 200);
  assert.equal((await fetch(`${base}/games/chess/index.js`)).status, 200);
  assert.equal((await fetch(`${base}/games/caro/caro.css`)).status, 200);
  assert.equal((await fetch(`${base}/games/chess/server.js`)).status, 404);
  assert.equal((await fetch(`${base}/%2e%2e/package.json`)).status, 404);
  const catalog = await (await fetch(`${base}/api/catalog`)).json();
  assert.deepEqual(catalog.games.map((g) => g.id), ['chess', 'caro']);
  const chess = catalog.games.find((g) => g.id === 'chess');
  assert.deepEqual(chess.options[0].choices.map((c) => c.value), ['standard', 'kingOfTheHill', 'threeCheck']);
  assert.ok(catalog.games.every((g) => g.opponents.some((o) => o.id === 'bot:greedy')));
});

test('contract: message lỗi được trả mã lỗi ổn định', async () => {
  const c = await client('Tester');
  await assert.rejects(c.request('no.such.type', {}), { code: 'unknown_type' });
  await assert.rejects(c.request('room.action', { roomId: 'x' }), { code: 'invalid_payload' });
  await assert.rejects(c.request('room.action', { roomId: 'x', action: [1] }), { code: 'invalid_payload' });
  await assert.rejects(c.request('room.join', { roomId: 'missing' }), { code: 'not_found' });
  await assert.rejects(c.request('room.create', { game: 'go' }), { code: 'invalid_payload' });
  c.ws.send('not json');
  assert.equal((await c.waitFor((m) => m.type === 'error')).payload.code, 'bad_message');
  c.ws.close();
});

test('hai người chơi cờ vua online: Fool’s mate, lưu replay + PGN', async () => {
  const alice = await client('Alice');
  const bob = await client('Bob');
  const { roomId } = await alice.request('room.create', { game: 'chess', timeControl: 'blitz-3+2', seat: 'b' });
  await bob.request('room.join', { roomId });
  const start = await bob.state(roomId, (s) => s.status === 'active');
  assert.equal(start.you, 'w');
  assert.deepEqual(start.active, ['w']);
  assert.equal(start.view.legalMoves.length, 20);
  assert.equal(start.clock.running, 'w');

  const plays = [[bob, 'f2f3'], [alice, 'e7e5'], [bob, 'g2g4'], [alice, 'd8h4']];
  for (const [who, uci] of plays) await who.request('room.action', { roomId, action: { uci } });

  const end = await alice.state(roomId, (s) => s.status === 'ended');
  assert.deepEqual(end.result, { winners: ['b'], reason: 'checkmate' });
  assert.deepEqual(end.log.map((e) => e.text), ['f3', 'e5', 'g4', 'Qh4#']);

  await new Promise((r) => setTimeout(r, 80));
  const files = (await readdir(archiveDir)).filter((f) => f.includes(roomId));
  assert.deepEqual(files.map((f) => f.split('.').pop()).sort(), ['json', 'pgn'], 'archive plugin: replay chung + PGN của module');
  alice.ws.close();
  bob.ws.close();
});

test('caro online qua CÙNG protocol: X thắng', async () => {
  const alice = await client('Alice');
  const bob = await client('Bob');
  const { roomId } = await alice.request('room.create', { game: 'caro', options: { variant: 'tictactoe' }, seat: 'x' });
  await bob.request('room.join', { roomId });
  const start = await alice.state(roomId, (s) => s.status === 'active');
  assert.equal(start.view.size, 3);
  assert.equal(start.summary, 'Tic-tac-toe 3×3');
  for (const [who, row, col] of [[alice, 0, 0], [bob, 1, 0], [alice, 1, 1], [bob, 2, 0], [alice, 2, 2]]) {
    await who.request('room.action', { roomId, action: { row, col } });
  }
  const end = await bob.state(roomId, (s) => s.status === 'ended');
  assert.deepEqual(end.result, { winners: ['x'], reason: 'line_complete' });
  assert.deepEqual([...end.view.winLine].sort(), [[0, 0], [1, 1], [2, 2]]);
  alice.ws.close();
  bob.ws.close();
});

test('khán giả nhận trạng thái và chat', async () => {
  const alice = await client('Alice');
  const bob = await client('Bob');
  const carol = await client('Carol');
  const { roomId } = await alice.request('room.create', { game: 'chess', options: { variant: 'kingOfTheHill' }, seat: 'w' });
  await bob.request('room.join', { roomId });
  await carol.request('room.watch', { roomId });
  const seen = await carol.state(roomId, (s) => s.status === 'active');
  assert.equal(seen.you, null);
  assert.deepEqual(seen.view.legalMoves, []);
  await carol.request('chat.send', { roomId, text: 'Chúc may mắn!' });
  const chat = await alice.waitFor((m) => m.type === 'chat.message');
  assert.equal(chat.payload.text, 'Chúc may mắn!');
  await assert.rejects(carol.request('room.action', { roomId, action: { uci: 'e2e4' } }), { code: 'forbidden' });
  [alice, bob, carol].forEach((c) => c.ws.close());
});

for (const game of ['chess', 'caro']) {
  test(`chơi ${game} với máy: bot tự hành động và tán gẫu`, async () => {
    const alice = await client('Alice');
    const first = game === 'chess' ? 'w' : 'x';
    const { roomId } = await alice.request('room.create', { game, seat: first, opponent: 'bot:greedy' });
    await alice.state(roomId, (s) => s.status === 'active');
    const action = game === 'chess' ? { uci: 'e2e4' } : { row: 7, col: 7 };
    await alice.request('room.action', { roomId, action });
    const reply = await alice.state(roomId, (s) => s.log.length === 2);
    assert.equal(reply.seats.find((s) => s.id !== first).player.isBot, true);

    const greet = await alice.waitFor((m) => m.type === 'chat.message' && m.payload.from.id === 'bot:greedy', 3000);
    assert.match(greet.payload.text, /Alice/);
    await alice.request('chat.send', { roomId, text: 'bạn tên là gì?' });
    const answer = await alice.waitFor(
      (m) => m.type === 'chat.message' && m.payload.from.id === 'bot:greedy' && /vô địch/.test(m.payload.text),
      3000,
    );
    assert.ok(answer);
    alice.ws.close();
  });
}

test('kết nối lại với cùng token nhận lại phòng đang chơi', async () => {
  const alice = await client('Alice');
  const welcome = alice.inbox.find((m) => m.type === 'welcome') ?? { payload: {} };
  const token = welcome.payload.player?.token;
  const { roomId } = await alice.request('room.create', { game: 'caro', opponent: 'bot:random' });
  alice.ws.close();

  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await new Promise((r) => ws.once('open', r));
  const got = new Promise((resolve) =>
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'room.state' && m.payload.id === roomId) resolve(m.payload);
    }),
  );
  ws.send(JSON.stringify({ v: 2, type: 'hello', payload: { token } }));
  const state = await got;
  assert.ok(state.you === 'x' || state.you === 'o');
  ws.close();
});
