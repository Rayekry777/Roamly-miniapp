Component({
  options: { multipleSlots: true },
  data: { statusBarHeight: 20 },
  properties: {
    title: { type: String, value: "" },
    back: { type: Boolean, value: true },
    emitBack: { type: Boolean, value: false },
    transparent: { type: Boolean, value: false },
  },
  lifetimes: {
    attached() {
      this.setData({
        statusBarHeight: wx.getWindowInfo().statusBarHeight || 20,
      });
    },
  },
  methods: {
    onBack() {
      if (this.data.emitBack) {
        this.triggerEvent("back");
        return;
      }
      const pages = getCurrentPages();
      if (pages.length > 1) wx.navigateBack();
      else wx.switchTab({ url: "/pages/home/index" });
    },
  },
});
