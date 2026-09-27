/** Xuất PGN từ dữ liệu ván cờ — dùng bởi plugin lưu trữ, không phụ thuộc Game. */
export function toPgn({ tags = {}, moves = [], result = '*' }) {
  const header = Object.entries(tags)
    .map(([k, v]) => `[${k} "${String(v).replace(/"/g, "'")}"]`)
    .join('\n');
  const body = [];
  moves.forEach((san, i) => {
    if (i % 2 === 0) body.push(`${i / 2 + 1}.`);
    body.push(san);
  });
  body.push(result);
  return `${header}\n\n${body.join(' ')}\n`;
}
