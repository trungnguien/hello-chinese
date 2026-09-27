import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/**
 * HTTP server: phục vụ file tĩnh theo bảng "mount" (dữ liệu) và các route API
 * lấy từ registry (plugin có thể thêm route mà không sửa file này).
 *
 * @param {{ mounts: { prefix: string, dir: string }[], routes: import('../../../shared/core/Registry.js').Registry }} opts
 */
export function createHttpServer({ mounts, routes }) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = routes.find(`${req.method} ${url.pathname}`);
      if (route) {
        const body = await route({ req, url });
        return send(res, 200, JSON.stringify(body), MIME['.json']);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
      const file = await resolveStatic(mounts, decodeURIComponent(url.pathname));
      if (!file) return send(res, 404, 'Not Found');
      const content = await readFile(file);
      send(res, 200, content, MIME[path.extname(file)] ?? 'application/octet-stream');
    } catch (err) {
      console.error('[http]', err);
      send(res, 500, 'Internal Server Error');
    }
  });
}

async function resolveStatic(mounts, pathname) {
  for (const { prefix, dir } of mounts) {
    if (!pathname.startsWith(prefix)) continue;
    let rel = pathname.slice(prefix.length);
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const root = path.resolve(dir);
    const file = path.resolve(root, '.' + path.posix.normalize('/' + rel));
    if (!file.startsWith(root + path.sep)) return null; // chặn path traversal
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      /* thử mount tiếp theo */
    }
  }
  return null;
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(body);
}
