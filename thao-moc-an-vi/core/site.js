// Lõi của site: registry, event bus và công cụ dựng DOM.
// Đây là contract ổn định — section, block, plugin và content chỉ phụ thuộc vào `window.Site`.
(function (global) {
  "use strict";

  function createRegistry(kind) {
    const items = new Map();
    return {
      register(name, item) {
        if (items.has(name)) throw new Error(`${kind} "${name}" đã được đăng ký`);
        items.set(name, item);
      },
      get(name) {
        return items.get(name);
      },
    };
  }

  function createEventBus() {
    const listeners = new Map();
    return {
      on(event, handler) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event).add(handler);
        return () => listeners.get(event).delete(handler);
      },
      emit(event, payload) {
        (listeners.get(event) || []).forEach((handler) => handler(payload));
      },
    };
  }

  // h("a", { href: "#x", class: "link" }, "Nội dung", childNode, [...])
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== false) el.setAttribute(key, value);
    });
    el.append(...children.flat(Infinity).filter((child) => child !== null && child !== undefined));
    return el;
  }

  global.Site = {
    sections: createRegistry("Section type"),
    blocks: createRegistry("Block type"),
    contents: createRegistry("Content"),
    events: createEventBus(),
    dom: { h },
  };
})(window);
