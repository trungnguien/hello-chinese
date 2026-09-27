import { at, place, candidateCells, lineThrough, winningCells, DIRECTIONS, other } from './rules.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function randomMove(match) {
  const [row, col] = pick(candidateCells(match.board, 1));
  return { row, col };
}

/**
 * Tham lam 1 nước: thắng ngay nếu được -> chặn đối thủ thắng ngay -> chọn ô
 * tạo/chặn chuỗi dài và thoáng nhất.
 */
export function greedyMove(match, seat) {
  const { board, rules } = match;
  const opp = other(seat);
  const win = winningCells(board, seat, rules);
  if (win.length) return toAction(pick(win));
  const block = winningCells(board, opp, rules);
  if (block.length) return toAction(pick(block));

  const value = (stone, r, c) => {
    place(board, r, c, stone);
    let score = 0;
    for (const d of DIRECTIONS) {
      const { length, ends } = lineThrough(board, r, c, stone, d);
      const open = ends.filter((e) => e === 'empty').length;
      if (open === 0 && length < rules.winLength) continue;
      score += Math.pow(10, Math.min(length, rules.winLength)) * (open + 1);
    }
    place(board, r, c, null);
    return score;
  };

  let best = [];
  let bestScore = -Infinity;
  for (const [r, c] of candidateCells(board, 2)) {
    if (at(board, r, c) !== null) continue;
    const score = value(seat, r, c) * 1.1 + value(opp, r, c) + Math.random();
    if (score > bestScore) {
      bestScore = score;
      best = [[r, c]];
    } else if (score === bestScore) best.push([r, c]);
  }
  return toAction(pick(best));
}

const toAction = ([row, col]) => ({ row, col });
