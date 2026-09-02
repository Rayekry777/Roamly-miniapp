import { authStore } from './store/auth'

App({
  globalData: { motionEnabled: true },
  onLaunch() {
    authStore.restore()
    const performance = wx.getDeviceInfo().benchmarkLevel
    this.globalData.motionEnabled = performance === undefined || performance < 0 || performance >= 10
  }
})
