import { authStore } from "./store/auth";
import { flushMediaCleanupQueue } from "./services/media";

App({
  globalData: { motionEnabled: true },
  onLaunch() {
    authStore.restore();
    const performance = wx.getDeviceInfo().benchmarkLevel;
    this.globalData.motionEnabled =
      performance === undefined || performance < 0 || performance >= 10;
  },
  onShow() {
    if (authStore.isLoggedIn()) void flushMediaCleanupQueue();
  },
});
