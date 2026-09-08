import { refreshCurrentUser } from "../../services/auth";
import { authStore } from "../../store/auth";
import {
  navigateToLogin,
  requireLogin,
  syncTabBar,
} from "../../utils/navigation";

Page({
  data: {
    user: authStore.user,
    loading: false,
    loggedIn: authStore.isLoggedIn(),
  },
  onShow() {
    syncTabBar(this);
    const loggedIn = authStore.isLoggedIn();
    this.setData({ loggedIn });
    if (loggedIn) void this.loadUser();
    else this.setData({ user: null, loading: false });
  },
  async loadUser() {
    this.setData({ loading: true });
    try {
      const user = await refreshCurrentUser();
      this.setData({ user });
    } catch {
      this.setData({ loggedIn: authStore.isLoggedIn(), user: authStore.user });
    } finally {
      this.setData({ loading: false });
    }
  },
  login() {
    navigateToLogin("/pages/me/index");
  },
  publish() {
    if (requireLogin())
      wx.navigateTo({ url: "/package-post/pages/publish/index" });
  },
  myPosts() {
    if (requireLogin())
      wx.navigateTo({ url: "/package-post/pages/mine/index" });
  },
  openProfile() {
    if (requireLogin())
      wx.navigateTo({ url: "/package-user/pages/account/index" });
  },
  openOrders() {
    if (requireLogin())
      wx.navigateTo({ url: "/package-order/pages/list/index" });
  },
  openWallet() {
    if (requireLogin())
      wx.navigateTo({ url: "/package-voucher/pages/wallet/index" });
  },
});
