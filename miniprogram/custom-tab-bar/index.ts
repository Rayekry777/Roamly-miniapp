import { navigateToTab, requireLogin } from '../utils/navigation'

const routes = ['/pages/home/index', '/pages/discover/index', '/pages/me/index']

Component({
  data: {
    value: '/pages/home/index',
    items: [
      { value: routes[0], label: '首页', icon: 'home' },
      { value: routes[1], label: '探店', icon: 'compass' },
      { value: routes[2], label: '我的', icon: 'user' }
    ]
  },
  methods: {
    onSelect(event: WechatMiniprogram.TouchEvent) {
      const url = String(event.currentTarget.dataset.value || '')
      if (!routes.includes(url)) return
      this.setData({ value: url })
      navigateToTab(url)
    },
    publish() {
      if (requireLogin()) wx.navigateTo({ url: '/package-blog/pages/publish/index' })
    }
  }
})
