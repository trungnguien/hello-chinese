// Section "article": khung chung gồm tiêu đề + danh sách block, tùy chọn cột phụ `aside`.
// Nội dung cụ thể do các block type quyết định, nên section này không cần sửa khi có loại nội dung mới.
Site.sections.register("article", (section, { h, renderBlocks }) => {
  const main = h("div", { class: "article-main" }, h("h2", {}, section.title), renderBlocks(section.blocks));
  const body = section.aside
    ? h("div", { class: "container two-col" }, main, h("aside", {}, renderBlocks(section.aside)))
    : h("div", { class: "container" }, main);

  return h("section", { id: section.id, class: `section section-${section.tone || "default"}` }, body);
});
