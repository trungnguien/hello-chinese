/**
 * Theo dõi kết nối của từng người chơi (một người có thể mở nhiều tab).
 * Công bố 'player.online' / 'player.offline' thay vì tự xử lý hệ quả (nguyên tắc 4).
 */
export class ConnectionHub {
  #connections = new Set();
  #byPlayer = new Map();

  constructor({ bus }) {
    this.bus = bus;
  }

  add(connection) {
    this.#connections.add(connection);
  }

  bind(connection, player) {
    if (connection.player?.id === player.id) return;
    if (connection.player) this.#unbind(connection);
    connection.player = player;
    if (!this.#byPlayer.has(player.id)) this.#byPlayer.set(player.id, new Set());
    const set = this.#byPlayer.get(player.id);
    set.add(connection);
    if (set.size === 1) this.bus.emit('player.online', { player });
  }

  remove(connection) {
    this.#connections.delete(connection);
    if (connection.player) this.#unbind(connection);
  }

  #unbind(connection) {
    const player = connection.player;
    const set = this.#byPlayer.get(player.id);
    set?.delete(connection);
    if (set && set.size === 0) {
      this.#byPlayer.delete(player.id);
      this.bus.emit('player.offline', { player });
    }
  }

  isOnline(playerId) {
    return this.#byPlayer.has(playerId);
  }

  sendToPlayer(playerId, message) {
    for (const c of this.#byPlayer.get(playerId) ?? []) c.send(message);
  }

  broadcast(message) {
    for (const c of this.#connections) if (c.player) c.send(message);
  }
}
