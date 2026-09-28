// Các block nội dung cơ bản. Contract: (block, ctx) => HTMLElement.
(function (Site) {
  "use strict";

  const listBlock = (tag, className) => (block, { h }) =>
    h(tag, { class: className }, block.items.map((item) => h("li", {}, item)));

  Site.blocks.register("paragraph", (block, { h }) => h("p", { class: block.muted ? "muted" : null }, block.text));

  Site.blocks.register("ordered-list", listBlock("ol", "criteria"));

  Site.blocks.register("card-grid", listBlock("ul", "card-grid"));

  Site.blocks.register("tags", listBlock("ul", "tag-list"));

  Site.blocks.register("facts", (block, { h }) =>
    h("dl", { class: "fact-card" },
      block.items.map(({ label, value }) => [h("dt", {}, label), h("dd", {}, value)])
    )
  );
})(window.Site);
