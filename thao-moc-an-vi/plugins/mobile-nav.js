// Plugin: bật/tắt menu trên mobile. Chỉ phụ thuộc vào capability `data-nav-toggle` / `data-nav`,
// không phụ thuộc section cụ thể nào tạo ra chúng.
Site.events.on("site:rendered", ({ root }) => {
  const toggle = root.querySelector("[data-nav-toggle]");
  const nav = root.querySelector("[data-nav]");
  if (!toggle || !nav) return;

  function setOpen(isOpen) {
    nav.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    Site.events.emit("nav:toggled", { isOpen });
  }

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
});
