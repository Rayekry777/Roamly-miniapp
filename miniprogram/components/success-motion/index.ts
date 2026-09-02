import lottie from 'lottie-miniprogram'
import successAnimation from '../../assets/lottie/success-data'

let activeAnimation: { destroy(): void } | undefined

Component({
  properties: { message: { type: String, value: '操作成功' } },
  data: { visible: false },
  lifetimes: {
    detached() { activeAnimation?.destroy(); activeAnimation = undefined }
  },
  methods: {
    show(duration = 1200) {
      this.setData({ visible: true }, () => this.play())
      setTimeout(() => this.setData({ visible: false }), duration)
    },
    play() {
      if (!getApp<{ globalData: { motionEnabled: boolean } }>().globalData.motionEnabled) return
      this.createSelectorQuery().select('#success-canvas').fields({ node: true, size: true }).exec((result) => {
        const canvas = result[0]?.node as WechatMiniprogram.Canvas
        if (!canvas) return
        lottie.setup(canvas)
        activeAnimation?.destroy()
        activeAnimation = lottie.loadAnimation({ renderer: 'canvas', loop: false, autoplay: true, animationData: successAnimation, rendererSettings: { context: canvas.getContext('2d') } })
      })
    }
  }
})
