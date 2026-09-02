Component({
  properties: {
    sections: { type: Array, value: [] },
  },
  methods: {
    onSelect(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
      this.triggerEvent("select", event.detail);
    },
  },
});
