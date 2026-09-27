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
      .map((p) => (p.module.includes('pgnArchive') ? { ...p, options: { dir: archiveDir } } : p)),
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
      ws.send(JSON.stringify({ v: 1, type, id, payload }));
      const reply = await c.waitFor((m) => m.replyTo === id);
      if (reply.type === 'error') throw Object.assign(new Error(reply.payload.message), { code: reply.payload.code });
      return reply.payload;
    },
    state: (gameId, pred = () => true) =>
      c.waitFor((m) => m.type === 'game.state' && m.payload.id === gameId && pred(m.payload)).then((m) => m.payload),
  };
  await c.request('hello', { name });
  return c;
}

test('HTTP: phục vụ client, shared và API', async () => {
  const base = `http://127.0.0.1:${port}`;
  assert.match(await (await fetch(`${base}/`)).text(), /Cờ vua online/);
  assert.equal((await fetch(`${base}/shared/protocol/contract.js`)).status, 200);
  assert.equal((await fetch(`${base}/%2e%2e/package.json`)).status, 404);
  const catalog = await (await fetch(`${base}/api/catalog`)).json();
  assert.deepEqual(catalog.variants.map((v) => v.id), ['standard', 'kingOfTheHill', 'threeCheck']);
  assert.ok(catalog.opponents.some((o) => o.id === 'bot:greedy'));
  assert.deepEqual(await (await fetch(`${base}/api/client-config`)).json(), { transport: { kind: 'websocket', path: '/ws' } });
});

test('contract: message lỗi được trả mã lỗi ổn định', async () => {
  const c = await client('Tester');
  await assert.rejects(c.request('no.such.type', {}), { code: 'unknown_type' });
  await assert.rejects(c.request('game.move', { gameId: 'x' }), { code: 'invalid_payload' });
  await assert.rejects(c.request('game.join', { gameId: 'missing' }), { code: 'not_found' });
  c.ws.send('not json');
  assert.equal((await c.waitFor((m) => m.type === 'error')).payload.code, 'bad_message');
  c.ws.close();
});

test('hai người chơi online: Fool’s mate', async () => {
  const alice = await client('Alice');
  const bob = await client('Bob');
  const { gameId } = await alice.request('game.create', { variant: 'standard', timeControl: 'blitz-3+2', color: 'b' });
  await bob.request('game.join', { gameId });
  const start = await bob.state(gameId, (s) => s.status === 'active');
  assert.equal(start.you, 'w');
  assert.equal(start.legalMoves.length, 20);
  assert.equal(start.clock.running, 'w');

  const plays = [[bob, 'f2f3'], [alice, 'e7e5'], [bob, 'g2g4'], [alice, 'd8h4']];
  for (const [who, uci] of plays) await who.request('game.move', { gameId, uci });

  const end = await alice.state(gameId, (s) => s.status === 'ended');
  assert.deepEqual(end.result, { winner: 'b', reason: 'checkmate', score: '0-1' });
  assert.deepEqual(end.moves.map((m) => m.san), ['f3', 'e5', 'g4', 'Qh4#']);

  await new Promise((r) => setTimeout(r, 50));
  const files = await readdir(archiveDir);
  assert.equal(files.length, 1, 'pgnArchive plugin đã ghi file');
  alice.ws.close();
  bob.ws.close();
});

test('khán giả nhận trạng thái và chat', async () => {
  const alice = await client('Alice');
  const bob = await client('Bob');
  const carol = await client('Carol');
  const { gameId } = await alice.request('game.create', { variant: 'kingOfTheHill', timeControl: 'untimed', color: 'w' });
  await bob.request('game.join', { gameId });
  await carol.request('game.watch', { gameId });
  const seen = await carol.state(gameId, (s) => s.status === 'active');
  assert.equal(seen.you, null);
  assert.deepEqual(seen.legalMoves, []);
  await carol.request('chat.send', { gameId, text: 'Chúc may mắn!' });
  const chat = await alice.waitFor((m) => m.type === 'chat.message');
  assert.equal(chat.payload.text, 'Chúc may mắn!');
  await assert.rejects(carol.request('game.move', { gameId, uci: 'e2e4' }), { code: 'forbidden' });
  [alice, bob, carol].forEach((c) => c.ws.close());
});

test('chơi với máy: bot tự trả lời nước đi', async () => {
  const alice = await client('Alice');
  const { gameId } = await alice.request('game.create', {
    variant: 'standard',
    timeControl: 'untimed',
    color: 'w',
    opponent: 'bot:greedy',
  });
  await alice.state(gameId, (s) => s.status === 'active');
  await alice.request('game.move', { gameId, uci: 'e2e4' });
  const reply = await alice.state(gameId, (s) => s.moves.length === 2);
  assert.equal(reply.players.b.isBot, true);
  assert.equal(reply.legalMoves.length > 0, true);
  alice.ws.close();
});

test('kết nối lại với cùng token nhận lại ván đang chơi', async () => {
  const alice = await client('Alice');
  const welcome = alice.inbox.find((m) => m.type === 'welcome') ?? { payload: {} };
  const token = welcome.payload.player?.token;
  const { gameId } = await alice.request('game.create', { variant: 'standard', timeControl: 'untimed', opponent: 'bot:random' });
  alice.ws.close();

  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await new Promise((r) => ws.once('open', r));
  const got = new Promise((resolve) =>
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'game.state' && m.payload.id === gameId) resolve(m.payload);
    }),
  );
  ws.send(JSON.stringify({ v: 1, type: 'hello', payload: { token } }));
  const state = await got;
  assert.ok(state.you === 'w' || state.you === 'b');
  ws.close();
});
