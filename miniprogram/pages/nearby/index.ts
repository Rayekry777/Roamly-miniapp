import { listShopTypeTree } from "../../services/shop";
import type { ShopType } from "../../types";
import { syncTabBar } from "../../utils/navigation";
Page({
  data: { categories: [] as ShopType[], loading: true, error: "" },
  onLoad() {
    void this.load();
  },
  onShow() {
    syncTabBar(this);
  },
  onPullDownRefresh() {
    void this.load().finally(() => wx.stopPullDownRefresh());
  },
  async load() {
    this.setData({ loading: true, error: "" });
    try {
      const result = await listShopTypeTree();
      this.setData({
        categories: (result.data || []).filter(
          (type) => type.id === "1" || type.id === "2",
        ),
      });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "分类加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  openCategory(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id);
    if (id !== "1" && id !== "2") return;
    wx.navigateTo({ url: `/package-shop/pages/list/index?categoryId=${id}` });
  },
});
