const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.getElementById("site-nav");

function setNavOpen(isOpen) {
  siteNav.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
}

navToggle.addEventListener("click", () => {
  setNavOpen(!siteNav.classList.contains("is-open"));
});

// Đóng menu trên mobile sau khi chọn một mục.
siteNav.addEventListener("click", (event) => {
  if (event.target.tagName === "A") setNavOpen(false);
});

document.getElementById("current-year").textContent = new Date().getFullYear();
