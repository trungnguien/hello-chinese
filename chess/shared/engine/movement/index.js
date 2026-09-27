import { Registry } from '../../core/Registry.js';
import { offset, forward, relativeRank } from '../geometry.js';
import { createMove } from '../move.js';

/**
 * Các "kiểu di chuyển" (movement kinds). Quân cờ được mô tả bằng DỮ LIỆU tham chiếu
 * tới các kiểu này (nguyên tắc 3). Muốn thêm quân mới (Archbishop, Camel...) chỉ cần
 * khai báo dữ liệu; muốn kiểu di chuyển hoàn toàn mới thì register thêm (nguyên tắc 6).
 *
 * Contract của một movement kind:
 *   moves(pos, from, piece, spec)   -> Move[]   (nước đi giả hợp lệ)
 *   attacks(pos, from, piece, spec) -> number[] (các ô bị khống chế)
 */
export const movementKinds = new Registry('movement kind');

function flipVector([df, dr], color) {
  return [df, dr * forward(color)];
}

movementKinds.register('leap', {
  moves(pos, from, piece, spec) {
    const out = [];
    for (const [df, dr] of spec.vectors) {
      const to = offset(from, df, dr);
      if (to === null) continue;
      const target = pos.get(to);
      if (!target) out.push(createMove({ from, to, piece }));
      else if (target.color !== piece.color) out.push(createMove({ from, to, piece, captured: target }));
    }
    return out;
  },
  attacks(pos, from, piece, spec) {
    return spec.vectors.map(([df, dr]) => offset(from, df, dr)).filter((sq) => sq !== null);
  },
});

movementKinds.register('slide', {
  moves(pos, from, piece, spec) {
    const out = [];
    for (const [df, dr] of spec.vectors) {
      let to = offset(from, df, dr);
      let steps = 0;
      while (to !== null && (!spec.maxSteps || steps < spec.maxSteps)) {
        const target = pos.get(to);
        if (target) {
          if (target.color !== piece.color) out.push(createMove({ from, to, piece, captured: target }));
          break;
        }
        out.push(createMove({ from, to, piece }));
        to = offset(to, df, dr);
        steps++;
      }
    }
    return out;
  },
  attacks(pos, from, piece, spec) {
    const out = [];
    for (const [df, dr] of spec.vectors) {
      let to = offset(from, df, dr);
      let steps = 0;
      while (to !== null && (!spec.maxSteps || steps < spec.maxSteps)) {
        out.push(to);
        if (pos.get(to)) break;
        to = offset(to, df, dr);
        steps++;
      }
    }
    return out;
  },
});

/**
 * Tốt: đi thẳng không ăn, ăn chéo. Vector được viết theo góc nhìn bên Trắng,
 * tự lật cho bên Đen. Phong cấp và bắt tốt qua đường là RULE riêng.
 */
movementKinds.register('pawn', {
  moves(pos, from, piece, spec) {
    const out = [];
    const [pf, pr] = flipVector(spec.push ?? [0, 1], piece.color);
    const one = offset(from, pf, pr);
    if (one !== null && !pos.get(one)) {
      out.push(createMove({ from, to: one, piece }));
      const doubleFrom = spec.doubleStepFromRank ?? 1;
      if (relativeRank(from, piece.color) === doubleFrom) {
        const two = offset(one, pf, pr);
        if (two !== null && !pos.get(two)) {
          out.push(createMove({ from, to: two, piece, flags: { doubleStep: true, epTarget: one } }));
        }
      }
    }
    for (const to of this.attacks(pos, from, piece, spec)) {
      const target = pos.get(to);
      if (target && target.color !== piece.color) out.push(createMove({ from, to, piece, captured: target }));
    }
    return out;
  },
  attacks(pos, from, piece, spec) {
    return (spec.captures ?? [[-1, 1], [1, 1]])
      .map((v) => flipVector(v, piece.color))
      .map(([df, dr]) => offset(from, df, dr))
      .filter((sq) => sq !== null);
  },
});
