import { authStore } from "./store/auth";
import { ensureRealLocation } from "./services/city";
import { flushMediaCleanupQueue } from "./services/media";

App({
  globalData: { motionEnabled: true },
  onLaunch() {
    authStore.restore();
    // 应用启动即发起一次真实定位，首页和其他本地入口复用同一个请求。
    void ensureRealLocation().catch(() => undefined);
    const performance = wx.getDeviceInfo().benchmarkLevel;
    this.globalData.motionEnabled =
      performance === undefined || performance < 0 || performance >= 10;
  },
  onShow() {
    if (authStore.isLoggedIn()) void flushMediaCleanupQueue();
  },
});
