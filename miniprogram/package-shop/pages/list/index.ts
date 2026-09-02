import { listShopTypes, listShopsByType, searchShops } from '../../../services/shop'
import type { Shop, ShopType } from '../../../types'
import { createRequestScope } from '../../../utils/scope'

Page({
  data: { title: '发现好店', keyword: '', types: [] as ShopType[], shops: [] as Shop[], typeId: '', current: 1, loading: false, finished: false, location: {} as { x?: number; y?: number } },
  onLoad(options) {
    this.scope = createRequestScope()
    this.setData({ typeId: options.typeId || '', title: options.name ? decodeURIComponent(options.name) : '发现好店' })
    void this.initialize()
  },
  onUnload() { this.scope?.close() },
  onPullDownRefresh() { void this.load(true).finally(() => wx.stopPullDownRefresh()) },
  onReachBottom() { if (!this.data.finished) void this.load(false) },
  async initialize() {
    try {
      const result = await this.scope?.run(listShopTypes())
      if (!result) return
      const types = result.data || []
      const typeId = this.data.typeId || types[0]?.id || '1'
      this.setData({ types, typeId })
      this.resolveLocation()
      await this.load(true)
    } catch {
      this.setData({ types: [], shops: [], loading: false })
    }
  },
  resolveLocation() {
    wx.getLocation({ type: 'gcj02', timeout: 3000, success: (res) => this.setData({ location: { x: res.longitude, y: res.latitude } }) })
  },
  onKeyword(event: WechatMiniprogram.CustomEvent) { const detail = event.detail as unknown as string | { value: string }; this.setData({ keyword: typeof detail === 'string' ? detail : detail.value }) },
  search() { void this.load(true) },
  selectType(event: WechatMiniprogram.TouchEvent) { this.setData({ typeId: String(event.currentTarget.dataset.id), keyword: '' }); void this.load(true) },
  async load(reset: boolean) {
    if (this.data.loading) return
    const current = reset ? 1 : this.data.current
    this.setData({ loading: true })
    try {
      const operation = this.data.keyword.trim()
        ? searchShops({ name: this.data.keyword.trim(), current })
        : listShopsByType({ typeId: this.data.typeId, current, ...this.data.location })
      const result = await this.scope?.run(operation)
      if (!result) return
      const rows = result.data || []
      this.setData({ shops: reset ? rows : [...this.data.shops, ...rows], current: current + 1, finished: rows.length < 5 })
    } catch {
      if (reset) this.setData({ shops: [], current: 1, finished: false })
    } finally { this.setData({ loading: false }) }
  },
  openShop(event: WechatMiniprogram.CustomEvent<{ id: string }>) { wx.navigateTo({ url: `/package-shop/pages/detail/index?id=${event.detail.id}` }) },
  scope: undefined as ReturnType<typeof createRequestScope> | undefined
})
