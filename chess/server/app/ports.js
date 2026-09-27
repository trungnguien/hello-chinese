/**
 * CÁC PORT (abstraction) mà tầng ứng dụng phụ thuộc — nguyên tắc 1 & 5.
 * Chỉ là tài liệu JSDoc: bất kỳ object nào thoả contract đều dùng được
 * (bộ nhớ, file, Redis, Postgres, WebSocket, SSE, WebRTC...).
 *
 * @typedef {object} GameRepository
 * @property {(session: import('./GameSession.js').GameSession) => Promise<void>} save
 * @property {(id: string) => Promise<import('./GameSession.js').GameSession | undefined>} get
 * @property {() => Promise<import('./GameSession.js').GameSession[]>} list
 * @property {(id: string) => Promise<void>} delete
 *
 * @typedef {object} Connection
 * @property {string} id
 * @property {(message: object) => void} send
 * @property {(handler: (raw: string) => void) => void} onMessage
 * @property {(handler: () => void) => void} onClose
 * @property {() => void} close
 *
 * @typedef {object} ServerTransport
 * @property {(httpServer: import('node:http').Server, onConnection: (c: Connection) => void) => void} attach
 * @property {() => Promise<void>} close
 *
 * @typedef {object} Scheduler
 * @property {(fn: () => void, ms: number) => any} setTimeout
 * @property {(handle: any) => void} clearTimeout
 *
 * @typedef {object} Plugin
 * @property {string} name
 * @property {(ctx: object, options: object) => (void | (() => void) | Promise<void | (() => void)>)} setup
 *   Trả về hàm teardown (tuỳ chọn).
 */
export const systemScheduler = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle),
};
