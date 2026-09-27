/** GameRepository trong bộ nhớ. Thay bằng Redis/DB chỉ cần giữ contract ở app/ports.js. */
export function createMemoryRepository() {
  const sessions = new Map();
  return {
    async save(session) {
      sessions.set(session.id, session);
    },
    async get(id) {
      return sessions.get(id);
    },
    async list() {
      return [...sessions.values()];
    },
    async delete(id) {
      sessions.delete(id);
    },
  };
}
