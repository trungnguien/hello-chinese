// Nội dung trang (tiếng Việt) — lấy từ tài liệu giới thiệu công ty.
// Sửa nội dung, thêm/bớt/sắp xếp section chỉ cần sửa file này.
Site.contents.register("company.vi", {
  meta: {
    lang: "vi",
    title: "Thảo Mộc An Vi – Công ty Cổ phần Thảo Mộc An Vi",
    description: "Công ty Cổ phần Thảo Mộc An Vi – sản xuất và chế biến đồ uống lên men, chưng cất và sản phẩm từ nông sản, thảo mộc tại Cao Phong, Phú Thọ.",
  },
  sections: [
    {
      type: "header",
      brand: { text: "Thảo Mộc", highlight: "An Vi" },
      menuLabel: "Menu",
    },
    {
      id: "top",
      type: "hero",
      eyebrow: "Thao Moc An Vi Joint Stock Company",
      title: "Công ty Cổ phần Thảo Mộc An Vi",
      lead: "Sản xuất và chế biến đồ uống lên men, chưng cất và các sản phẩm có nguồn gốc từ nông sản, thảo mộc tại Cao Phong, Phú Thọ.",
      cta: { label: "Hợp tác với chúng tôi", href: "#hop-tac" },
    },
    {
      id: "gioi-thieu",
      navLabel: "Giới thiệu",
      type: "article",
      title: "Giới thiệu chung",
      blocks: [
        { type: "paragraph", text: "Công ty Cổ phần Thảo Mộc An Vi là doanh nghiệp hoạt động trong lĩnh vực sản xuất và chế biến đồ uống, trong đó định hướng trọng tâm là các sản phẩm lên men, chưng cất và các sản phẩm có nguồn gốc từ nông sản, thảo mộc." },
        { type: "paragraph", text: "Hiện nay, Công ty đang đầu tư xây dựng nhà máy sản xuất tại Cao Phong, Phú Thọ. Nhà máy đang trong giai đoạn xây dựng, lắp đặt hạ tầng và từng bước lựa chọn, thử nghiệm các thiết bị công nghệ trước khi hoàn thiện dây chuyền sản xuất chính thức." },
      ],
      aside: [
        {
          type: "facts",
          items: [
            { label: "Tên tiếng Anh", value: "Thao Moc An Vi Joint Stock Company" },
            { label: "Mã số thuế", value: "5400569689" },
            { label: "Ngày hoạt động", value: "23/03/2026" },
            { label: "Địa chỉ", value: "Thôn Nhõi, Xã Cao Phong, Tỉnh Phú Thọ, Việt Nam" },
          ],
        },
      ],
    },
    {
      id: "linh-vuc",
      navLabel: "Lĩnh vực",
      type: "article",
      tone: "alt",
      title: "Lĩnh vực hoạt động",
      blocks: [
        {
          type: "card-grid",
          items: [
            "Chưng, tinh cất và pha chế các loại rượu",
            "Sản xuất các sản phẩm đồ uống lên men",
            "Sản xuất rượu vang, bia và các loại đồ uống khác",
            "Sản xuất, chế biến các sản phẩm từ nông sản",
            "Sản xuất và chế biến chè",
            "Sản xuất các sản phẩm và tinh dầu có nguồn gốc từ thảo dược",
            "Kinh doanh các sản phẩm do Công ty sản xuất",
          ],
        },
        { type: "paragraph", muted: true, text: "Trong giai đoạn đầu, Công ty tập trung nghiên cứu và hoàn thiện quy trình sản xuất các sản phẩm lên men và chưng cất, đồng thời đánh giá các công nghệ và thiết bị phù hợp với yêu cầu về chất lượng sản phẩm." },
      ],
    },
    {
      id: "nha-may",
      navLabel: "Dự án nhà máy",
      type: "article",
      title: "Dự án nhà máy",
      blocks: [
        { type: "paragraph", text: "Nhà máy hiện đang trong quá trình xây dựng và hoàn thiện hệ thống sản xuất. Song song với việc xây dựng nhà máy, Công ty đang làm việc với các nhà sản xuất thiết bị trong và ngoài nước để lựa chọn công nghệ phù hợp cho từng công đoạn của dây chuyền." },
        { type: "paragraph", text: "Đối với các thiết bị công nghệ quan trọng, Công ty ưu tiên thực hiện thử nghiệm ở quy mô phù hợp để đánh giá:" },
        {
          type: "ordered-list",
          items: [
            "Chất lượng sản phẩm đầu ra",
            "Khả năng kiểm soát quá trình sản xuất",
            "Độ ổn định của thiết bị",
            "Khả năng vệ sinh và bảo trì",
            "Mức độ phù hợp với quy trình sản xuất thực tế",
            "Khả năng mở rộng lên quy mô sản xuất lớn hơn",
          ],
        },
        { type: "paragraph", text: "Sau khi kết quả thử nghiệm đáp ứng yêu cầu, Công ty sẽ xem xét đầu tư hệ thống có công suất lớn hơn cho nhà máy." },
      ],
    },
    {
      id: "hop-tac",
      navLabel: "Hợp tác",
      type: "article",
      tone: "alt",
      title: "Định hướng hợp tác thiết bị",
      blocks: [
        { type: "paragraph", text: "Công ty mong muốn hợp tác lâu dài với các nhà sản xuất có năng lực kỹ thuật tốt, đặc biệt đối với các thiết bị liên quan đến quá trình lên men, chưng cất và xử lý sản phẩm." },
        { type: "paragraph", text: "Trong quá trình lựa chọn thiết bị, Công ty đặc biệt quan tâm đến:" },
        {
          type: "tags",
          items: [
            "Thiết kế kỹ thuật",
            "Vật liệu chế tạo",
            "Chất lượng gia công",
            "Khả năng kiểm soát quá trình",
            "Độ ổn định của thiết bị",
            "Chất lượng sản phẩm đầu ra",
          ],
        },
        { type: "paragraph", text: "Các thiết bị thử nghiệm hiện tại được xem là một phần trong quá trình đánh giá công nghệ trước khi Công ty quyết định cấu hình và quy mô đầu tư cho hệ thống sản xuất chính thức." },
      ],
    },
    {
      id: "lien-he",
      navLabel: "Liên hệ",
      type: "footer",
      name: "Công ty Cổ phần Thảo Mộc An Vi",
      lines: [
        "Thôn Nhõi, Xã Cao Phong, Tỉnh Phú Thọ, Việt Nam",
        "Mã số thuế: 5400569689",
      ],
      copyright: "© {year} Thảo Mộc An Vi. Bảo lưu mọi quyền.",
    },
  ],
});
