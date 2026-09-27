import { WebSocketServer } from 'ws';

/**
 * ServerTransport dựa trên WebSocket. Tầng trên chỉ thấy `Connection`
 * (xem app/ports.js) — có thể thay bằng SSE, socket.io, WebRTC... (nguyên tắc 1).
 */
export function createWebSocketTransport({ path = '/ws', heartbeatMs = 30000, maxPayload = 16 * 1024 } = {}) {
  let wss;
  let heartbeat;
  let counter = 0;

  return {
    attach(httpServer, onConnection) {
      wss = new WebSocketServer({ server: httpServer, path, maxPayload });
      wss.on('connection', (socket) => {
        socket.isAlive = true;
        socket.on('pong', () => (socket.isAlive = true));
        onConnection({
          id: `c${++counter}`,
          send(message) {
            if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
          },
          onMessage(handler) {
            socket.on('message', (data) => handler(data.toString()));
          },
          onClose(handler) {
            socket.on('close', handler);
          },
          close() {
            socket.close();
          },
        });
      });
      heartbeat = setInterval(() => {
        for (const socket of wss.clients) {
          if (!socket.isAlive) socket.terminate();
          else {
            socket.isAlive = false;
            socket.ping();
          }
        }
      }, heartbeatMs);
    },
    async close() {
      clearInterval(heartbeat);
      for (const socket of wss?.clients ?? []) socket.terminate();
      await new Promise((resolve) => (wss ? wss.close(() => resolve()) : resolve()));
    },
    /** Thông tin client cần để kết nối (late binding phía client). */
    clientConfig() {
      return { kind: 'websocket', path };
    },
  };
}
