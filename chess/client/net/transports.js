import { Registry } from '/shared/core/Registry.js';
import { EventBus } from '/shared/core/EventBus.js';

/**
 * Transport phía client. Loại transport được server quyết định qua
 * /api/client-config và chỉ được chọn lúc chạy (late binding).
 *
 * Contract: { connect(), send(obj), close(), events: EventBus('open'|'close'|'message') }
 */
export const clientTransports = new Registry('client transport');

clientTransports.register('websocket', ({ path }) => {
  const events = new EventBus();
  let socket = null;
  let retry = 0;
  let closedByUser = false;
  const queue = [];

  function connect() {
    closedByUser = false;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${proto}//${location.host}${path}`);
    socket.addEventListener('open', () => {
      retry = 0;
      events.emit('open');
      while (queue.length) socket.send(queue.shift());
    });
    socket.addEventListener('message', (e) => events.emit('message', e.data));
    socket.addEventListener('close', () => {
      events.emit('close');
      if (closedByUser) return;
      const delay = Math.min(10000, 500 * 2 ** retry++);
      setTimeout(connect, delay);
    });
  }

  return {
    events,
    connect,
    send(message) {
      const data = JSON.stringify(message);
      if (socket?.readyState === WebSocket.OPEN) socket.send(data);
      else queue.push(data);
    },
    close() {
      closedByUser = true;
      socket?.close();
    },
  };
});
