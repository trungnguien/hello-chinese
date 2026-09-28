Site.sections.register("footer", (section, { h }) => {
  const copyright = section.copyright.replace("{year}", new Date().getFullYear());

  return h("footer", { id: section.id, class: "site-footer" },
    h("div", { class: "container" },
      h("p", { class: "footer-name" }, section.name),
      section.lines.map((line) => h("p", {}, line)),
      h("p", { class: "copyright" }, copyright)
    )
  );
});
