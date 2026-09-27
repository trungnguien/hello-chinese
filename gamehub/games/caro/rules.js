/**
 * Luật Caro — hàm thuần, không phụ thuộc nền tảng. Biến thể là DỮ LIỆU (nguyên tắc 3).
 * Ô: (row, col), row 0 là hàng trên cùng.
 */
export const CARO_VARIANTS = {
  freestyle: {
    name: 'Caro tự do 15×15',
    size: 15,
    winLength: 5,
    blockedEnds: false,
    description: '5 quân liên tiếp theo hàng ngang, dọc hoặc chéo là thắng.',
  },
  vietnam: {
    name: 'Caro chặn hai đầu',
    size: 15,
    winLength: 5,
    blockedEnds: true,
    description: 'Luật Việt Nam: hàng 5 quân bị đối thủ chặn cả hai đầu thì không được tính thắng.',
  },
  tictactoe: {
    name: 'Tic-tac-toe 3×3',
    size: 3,
    winLength: 3,
    blockedEnds: false,
    description: '3 quân thẳng hàng trên bàn 3×3 — ván nhanh cho mọi lứa tuổi.',
  },
};

export const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const other = (stone) => (stone === 'x' ? 'o' : 'x');

export function createBoard(size) {
  return { size, cells: new Array(size * size).fill(null), filled: 0 };
}

export const inside = (board, r, c) => r >= 0 && c >= 0 && r < board.size && c < board.size;
export const at = (board, r, c) => (inside(board, r, c) ? board.cells[r * board.size + c] : undefined);

export function place(board, r, c, stone) {
  board.cells[r * board.size + c] = stone;
  board.filled += stone ? 1 : -1;
}

/** Dãy quân `stone` liên tiếp đi qua (r, c) theo hướng d, kèm tình trạng hai đầu. */
export function lineThrough(board, r, c, stone, [dr, dc]) {
  const cells = [[r, c]];
  const walk = (sign) => {
    let rr = r + dr * sign;
    let cc = c + dc * sign;
    while (at(board, rr, cc) === stone) {
      cells.push([rr, cc]);
      rr += dr * sign;
      cc += dc * sign;
    }
    const end = at(board, rr, cc);
    return end === undefined ? 'edge' : end === null ? 'empty' : 'opponent';
  };
  const ends = [walk(1), walk(-1)];
  return { length: cells.length, cells, ends };
}

/** Các ô tạo thành hàng thắng nếu `stone` vừa đặt tại (r, c); null nếu chưa thắng. */
export function winningLine(board, r, c, stone, rules) {
  for (const d of DIRECTIONS) {
    const line = lineThrough(board, r, c, stone, d);
    if (line.length < rules.winLength) continue;
    if (rules.blockedEnds && line.ends.every((e) => e === 'opponent')) continue;
    return line.cells;
  }
  return null;
}

/** Ô trống lân cận các quân đã có (bán kính `radius`) — ứng viên cho bot/đe doạ. */
export function candidateCells(board, radius = 2) {
  const out = [];
  if (board.filled === 0) {
    const mid = Math.floor(board.size / 2);
    return [[mid, mid]];
  }
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      if (at(board, r, c) !== null) continue;
      let near = false;
      for (let dr = -radius; dr <= radius && !near; dr++) {
        for (let dc = -radius; dc <= radius && !near; dc++) {
          if (at(board, r + dr, c + dc)) near = true;
        }
      }
      if (near) out.push([r, c]);
    }
  }
  return out;
}

/** Các ô mà `stone` đặt vào sẽ thắng ngay. */
export function winningCells(board, stone, rules) {
  const out = [];
  for (const [r, c] of candidateCells(board, 1)) {
    place(board, r, c, stone);
    if (winningLine(board, r, c, stone, rules)) out.push([r, c]);
    place(board, r, c, null);
  }
  return out;
}

/** Nhãn toạ độ kiểu "H8": cột A.., hàng đếm từ dưới lên. */
export function cellLabel(r, c, size) {
  return String.fromCharCode(65 + c) + (size - r);
}
