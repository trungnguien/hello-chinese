/**
 * Nạp client của module game LÚC CHẠY từ manifest (late binding — nguyên tắc 2).
 * Vỏ ứng dụng không import tĩnh bất kỳ game nào.
 */
const cache = new Map();

export function loadGameClient(manifest) {
  if (!cache.has(manifest.id)) {
    const base = `/games/${manifest.id}/`;
    if (manifest.client?.styles) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = base + manifest.client.styles;
      document.head.append(link);
    }
    const promise = import(base + (manifest.client?.entry ?? 'index.js')).then((mod) => {
      if (typeof mod.mount !== 'function') throw new Error(`Game "${manifest.id}" client has no mount()`);
      return mod;
    });
    promise.catch(() => cache.delete(manifest.id));
    cache.set(manifest.id, promise);
  }
  return cache.get(manifest.id);
}
