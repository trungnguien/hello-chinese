// Section "header": menu được suy ra từ các section có `navLabel`, không khai báo cứng.
Site.sections.register("header", (section, { h, content }) => {
  const navLinks = content.sections
    .filter((item) => item.navLabel)
    .map((item) => h("a", { href: `#${item.id}` }, item.navLabel));

  return h("header", { class: "site-header" },
    h("div", { class: "container header-inner" },
      h("a", { class: "brand", href: "#top" }, section.brand.text, " ", h("span", {}, section.brand.highlight)),
      h("button", {
        class: "nav-toggle",
        type: "button",
        "data-nav-toggle": "",
        "aria-expanded": "false",
        "aria-controls": "site-nav",
      }, section.menuLabel),
      h("nav", { id: "site-nav", class: "site-nav", "data-nav": "" }, navLinks)
    )
  );
});
