Site.sections.register("hero", (section, { h }) =>
  h("section", { id: section.id, class: "hero" },
    h("div", { class: "container" },
      h("p", { class: "eyebrow" }, section.eyebrow),
      h("h1", {}, section.title),
      h("p", { class: "lead" }, section.lead),
      section.cta && h("a", { class: "button", href: section.cta.href }, section.cta.label)
    )
  )
);
