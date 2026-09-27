import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertGameModule, assertMatch, resolveOptions } from '../shared/gameModule.js';
import { seededRandom } from '../shared/random.js';
import { ALL_GAMES } from './helpers.js';

/**
 * BỘ TEST TUÂN THỦ CONTRACT — chạy cho MỌI module game (nguyên tắc 5).
 * Module mới chỉ cần thêm vào ALL_GAMES là được kiểm tra tự động.
 */
for (const module of ALL_GAMES) {
  const { manifest } = module;
  const seats = manifest.seats.map((s) => s.id);
  const newMatch = (options = resolveOptions(manifest)) =>
    assertMatch(module.createMatch({ options, seats, rng: seededRandom(1) }), manifest.id);

  test(`[${manifest.id}] manifest hợp lệ và JSON hoá được`, () => {
    assertGameModule(module, manifest.id);
    assert.deepEqual(JSON.parse(JSON.stringify(manifest)), manifest);
  });

  for (const opt of manifest.options ?? []) {
    for (const choice of opt.choices) {
      test(`[${manifest.id}] ${opt.id}=${choice.value}: chơi ngẫu nhiên tới khi kết thúc, tất định khi phát lại`, () => {
        const options = resolveOptions(manifest, { [opt.id]: choice.value });
        const rng = seededRandom(42);
        const match = newMatch(options);
        const log = [];
        for (let i = 0; i < 300 && !match.outcome(); i++) {
          const [seat] = match.activeSeats();
          assert.ok(seats.includes(seat), 'activeSeats trả ghế hợp lệ');
          const actions = match.legalActions(seat);
          assert.ok(actions.length > 0, 'còn hành động hợp lệ khi chưa kết thúc');
          const other = seats.find((s) => s !== seat);
          assert.deepEqual(match.legalActions(other), [], 'ghế không tới lượt không có hành động');
          const action = actions[Math.floor(rng() * actions.length)];
          const res = match.act(seat, action);
          assert.equal(typeof (res?.text ?? ''), 'string');
          log.push({ seat, action });
          for (const s of [...seats, null]) JSON.stringify(match.view(s)); // view phải JSON hoá được
        }
        const outcome = match.outcome();
        if (outcome) {
          assert.deepEqual(match.activeSeats(), [], 'hết ván thì không ai phải hành động');
          assert.ok(outcome.winners.every((w) => seats.includes(w)));
          assert.equal(typeof outcome.reason, 'string');
        }
        // Phát lại nhật ký trên ván mới phải ra cùng trạng thái (nền tảng cho replay/khôi phục).
        const replay = newMatch(options);
        for (const { seat, action } of log) replay.act(seat, action);
        assert.deepEqual(replay.view(null), match.view(null));
        assert.deepEqual(replay.outcome(), match.outcome());
      });
    }
  }

  test(`[${manifest.id}] hành động sai luật ném lỗi có mã`, () => {
    const match = newMatch();
    const [seat] = match.activeSeats();
    assert.throws(() => match.act(seat, { nonsense: true }), (err) => typeof err.code === 'string');
    const other = seats.find((s) => s !== seat);
    assert.throws(() => match.act(other, match.legalActions(seat)[0]), { code: 'not_your_turn' });
  });

  test(`[${manifest.id}] bot của module trả hành động hợp lệ`, () => {
    for (const [id, strategy] of Object.entries(module.bots ?? {})) {
      const match = newMatch();
      const [seat] = match.activeSeats();
      assert.doesNotThrow(() => match.act(seat, strategy(match, seat)), `bot ${id}`);
    }
  });
}
