// Khởi động site: chọn content theo cấu hình trong HTML (late binding) rồi dựng từng section.
(function (Site) {
  "use strict";

  function createContext(content) {
    const ctx = { content, h: Site.dom.h, emit: Site.events.emit };
    ctx.renderBlocks = (blocks) => (blocks || []).map((block) => renderBlock(block, ctx));
    return ctx;
  }

  function renderBlock(block, ctx) {
    const render = Site.blocks.get(block.type);
    if (!render) {
      console.warn(`Chưa có block type "${block.type}"`);
      return null;
    }
    return render(block, ctx);
  }

  function renderSection(section, ctx) {
    const render = Site.sections.get(section.type);
    if (!render) {
      console.warn(`Chưa có section type "${section.type}"`);
      return null;
    }
    const el = render(section, ctx);
    Site.events.emit("section:rendered", { section, el });
    return el;
  }

  function applyMeta(meta) {
    document.documentElement.lang = meta.lang;
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
  }

  function boot(root) {
    const content = Site.contents.get(root.dataset.content);
    if (!content) throw new Error(`Không tìm thấy content "${root.dataset.content}"`);

    const ctx = createContext(content);
    applyMeta(content.meta);
    root.replaceChildren(...content.sections.map((section) => renderSection(section, ctx)).filter(Boolean));
    Site.events.emit("site:rendered", { root, content });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-site-root]").forEach(boot);
  });
})(window.Site);
