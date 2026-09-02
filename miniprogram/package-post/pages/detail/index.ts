Page({
  data: {
    focusCommentId: "",
    focusComposer: false,
  },
  onLoad(options) {
    this.setData({
      focusCommentId: String(options.focusCommentId || ""),
      focusComposer: options.focusComposer === "1",
    });
  },
});
