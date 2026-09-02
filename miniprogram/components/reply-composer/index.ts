Component({
  properties: {
    targetName: { type: String, value: "" },
    loading: { type: Boolean, value: false },
    focusToken: { type: Number, value: 0 },
    resetToken: { type: Number, value: 0 },
    draftText: { type: String, value: "" },
  },
  data: {
    content: "",
    focused: false,
  },
  observers: {
    focusToken(value: number) {
      if (value > 0) this.setData({ focused: true });
    },
    resetToken() {
      this.setData({ content: "" });
    },
    draftText(value: string) {
      if (value !== this.data.content) this.setData({ content: value });
    },
  },
  methods: {
    onInput(event: WechatMiniprogram.Input) {
      this.setData({ content: event.detail.value });
    },
    onFocus() {
      this.setData({ focused: true });
    },
    onBlur() {
      this.setData({ focused: false });
    },
    onCancelReply() {
      this.triggerEvent("cancelreply");
    },
    onSubmit() {
      if (this.data.loading) return;
      this.triggerEvent("submit", { content: this.data.content });
    },
  },
});
