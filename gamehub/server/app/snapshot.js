import { describeOptions } from '../../shared/gameModule.js';

/**
 * Ánh xạ trạng thái nội bộ -> DTO theo contract ROOM_STATE (nguyên tắc 5).
 * Phần riêng của từng game nằm trong `view`, do module quyết định.
 */
const publicPlayer = (p) => (p ? { id: p.id, name: p.name, isBot: Boolean(p.isBot) } : null);

function common(room) {
  const { manifest } = room.module;
  return {
    id: room.id,
    status: room.status,
    game: { id: manifest.id, name: manifest.name, icon: manifest.icon },
    options: room.options,
    summary: describeOptions(manifest, room.options),
    timeControl: room.timeControl.kind === 'untimed' ? null : { id: room.timeControl.id, label: room.timeControl.label },
    seats: manifest.seats.map((s) => ({ id: s.id, label: s.label, player: publicPlayer(room.players[s.id]) })),
  };
}

export function toRoomState(room, viewerId, now = Date.now()) {
  const you = room.seatOf(viewerId);
  const clock = room.clock.snapshot();
  const active = room.status === 'active' ? room.match.activeSeats() : [];
  return {
    ...common(room),
    you,
    active,
    clock: clock ? { ...clock, serverNow: now } : null,
    drawOffer: room.drawOffer,
    result: room.result,
    log: room.log,
    // Trước khi ván bắt đầu, không ai được hành động -> xem như khán giả.
    view: room.match.view(room.status === 'active' ? you : null),
    spectators: room.spectators.size,
    capabilities: room.module.manifest.capabilities ?? {},
  };
}

export function toLobbyEntry(room) {
  return { ...common(room), actions: room.actions.length, createdAt: room.createdAt };
}
