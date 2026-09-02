import { syncTabBar } from "../../utils/navigation";

Page({
  onShow() {
    syncTabBar(this);
  },
  openShopList() {
    wx.navigateTo({ url: "/package-shop/pages/list/index" });
  },
});
