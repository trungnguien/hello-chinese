import { isChatFocused, focusChat } from "./ui.js";

export const keys = new Set();
export const mouse = { x: 0, y: 0, clicked: false };

export function initInput(canvas) {
  window.addEventListener("keydown", (e) => {
    if (isChatFocused()) {
      if (e.key === "Escape") document.activeElement.blur();
      return;
    }
    if (e.key === "Enter") {
      focusChat();
      e.preventDefault();
      return;
    }
    keys.add(e.key.toLowerCase());
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener("click", () => {
    mouse.clicked = true;
  });
}

export function consumeClick() {
  const was = mouse.clicked;
  mouse.clicked = false;
  return was;
}
