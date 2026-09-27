import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from './bootstrap.js';

const configPath = process.env.CHESS_CONFIG ?? new URL('../config/default.js', import.meta.url).pathname;
const { default: config } = await import(pathToFileURL(path.resolve(configPath)).href);

const app = await createApp(config);
const address = await app.listen();
console.log(`🎲 GameHub đang chạy tại http://localhost:${address.port}`);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
