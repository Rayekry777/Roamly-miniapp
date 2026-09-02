export const motion = {
  createEntrance(): WechatMiniprogram.AnimationExportResult {
    return wx.createAnimation({ duration: 320, timingFunction: 'ease-out' }).translateY(0).opacity(1).step().export()
  },
  enabled(): boolean { return getApp<{ globalData: { motionEnabled: boolean } }>().globalData.motionEnabled }
}
