/**
 * Các "fact" dùng để điền vào mẫu câu. Tính LƯỜI (chỉ khi mẫu cần) và trả về
 * undefined khi không áp dụng được — brain sẽ bỏ qua câu đó.
 *
 * Fact chung do nền tảng tính (tên, số nước...). Fact riêng của game
 * (assessment, hint) do module cung cấp qua match.chatFacts(seat) — nguyên tắc 7.
 */
export function createFacts({ room, bot, extra = {} }) {
  const botSeat = room.seatOf(bot.id);
  const humanSeat = room.opponentsOf(botSeat).find((s) => room.players[s] && !room.players[s].isBot);
  const moduleFacts = humanSeat ? room.match.chatFacts?.(humanSeat) ?? {} : {};
  return {
    bot: () => bot.name,
    opponent: () => room.players[humanSeat]?.name,
    game: () => room.module.manifest.name,
    moves: () => room.actions.filter((a) => a.seat === botSeat).length,
    lastMove: () => room.log.at(-1)?.text || undefined,
    piece: () => extra.label,
    assessment: () => moduleFacts.assessment?.(),
    hint: () => (room.status === 'active' ? moduleFacts.hint?.() : undefined),
  };
}
