import { refreshCurrentUser, signOut } from "../../services/auth";
import * as userService from "../../services/user";
import { authStore } from "../../store/auth";
import {
  navigateToLogin,
  requireLogin,
  syncTabBar,
} from "../../utils/navigation";

Page({
  data: {
    user: authStore.user,
    signs: 0,
    signed: false,
    loading: false,
    loggedIn: authStore.isLoggedIn(),
  },
  onShow() {
    syncTabBar(this);
    const loggedIn = authStore.isLoggedIn();
    this.setData({ loggedIn });
    if (loggedIn) void this.loadUser();
    else this.setData({ user: null, signs: 0, signed: false, loading: false });
  },
  async loadUser() {
    this.setData({ loading: true });
    try {
      const [user, signs] = await Promise.all([
        refreshCurrentUser(),
        userService.signCount(),
      ]);
      this.setData({ user, signs: signs.data || 0 });
    } catch {
      this.setData({ loggedIn: authStore.isLoggedIn(), user: authStore.user });
    } finally {
      this.setData({ loading: false });
    }
  },
  async sign() {
    if (!requireLogin("/pages/me/index") || this.data.signed) return;
    await userService.signIn();
    this.setData({ signed: true, signs: this.data.signs + 1 });
    this.selectComponent("#sign-motion")?.show();
  },
  login() {
    navigateToLogin("/pages/me/index");
  },
  publish() {
    if (requireLogin())
      wx.navigateTo({ url: "/package-post/pages/publish/index" });
  },
  myBlogs() {
    if (requireLogin())
      wx.navigateTo({ url: "/package-blog/pages/mine/index" });
  },
  async logout() {
    try {
      await signOut();
    } catch {
      /* 请求层已经提示网络错误，本地会话仍需退出 */
    }
    this.setData({ user: null, signs: 0, signed: false, loggedIn: false });
  },
});
