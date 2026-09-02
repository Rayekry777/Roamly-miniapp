import { listHotBlogs } from '../../services/blog'
import { listShopTypes, listShopsByType } from '../../services/shop'
import { authStore } from '../../store/auth'
import type { Blog, Shop, ShopType } from '../../types'
import { navigateToTab, syncTabBar } from '../../utils/navigation'
import { createRequestScope } from '../../utils/scope'

Page({
  data: { types: [] as ShopType[], shops: [] as Shop[], blogs: [] as Blog[], loading: true, avatar: '' },
  onLoad() { this.scope = createRequestScope(); void this.loadHome() },
  onShow() { syncTabBar(this); this.setData({ avatar: authStore.user?.icon || '' }) },
  onUnload() { this.scope?.close() },
  async loadHome() {
    try {
      const result = await this.scope?.run(Promise.all([listShopTypes(), listHotBlogs(1)]))
      if (!result) return
      const types = result[0].data || []
      const blogs = result[1].data || []
      this.setData({ types, blogs })
      const first = types[0]
      if (!first) return
      const location = await this.getLocationFallback()
      const shopsResult = await this.scope?.run(listShopsByType({ typeId: first.id, current: 1, ...location }))
      if (shopsResult) this.setData({ shops: shopsResult.data || [] })
    } catch {
      this.setData({ types: [], shops: [], blogs: [] })
    } finally { this.setData({ loading: false }) }
  },
  getLocationFallback(): Promise<{ x?: number; y?: number }> {
    return new Promise((resolve) => wx.getLocation({ type: 'gcj02', timeout: 3000, success: (res) => resolve({ x: res.longitude, y: res.latitude }), fail: () => resolve({}) }))
  },
  openShops(event?: WechatMiniprogram.TouchEvent) {
    const typeId = String(event?.currentTarget.dataset.id || '')
    const name = String(event?.currentTarget.dataset.name || '')
    wx.navigateTo({ url: `/package-shop/pages/list/index${typeId ? `?typeId=${typeId}&name=${encodeURIComponent(name)}` : ''}` })
  },
  openShop(event: WechatMiniprogram.CustomEvent<{ id: string }>) { wx.navigateTo({ url: `/package-shop/pages/detail/index?id=${event.detail.id}` }) },
  openBlog(event: WechatMiniprogram.CustomEvent<{ id: string }>) { wx.navigateTo({ url: `/package-blog/pages/detail/index?id=${event.detail.id}` }) },
  openMe() { navigateToTab('/pages/me/index') },
  openDiscover() { wx.switchTab({ url: '/pages/discover/index' }) },
  scope: undefined as ReturnType<typeof createRequestScope> | undefined
})
