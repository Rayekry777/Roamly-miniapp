import { listHotBlogs } from '../../services/blog'
import type { Blog } from '../../types'
import { navigateToTab, requireLogin, syncTabBar } from '../../utils/navigation'
import { createRequestScope } from '../../utils/scope'

Page({
  data: { blogs: [] as Blog[], current: 1, loading: false, finished: false },
  onLoad() { this.scope = createRequestScope(); void this.load(true) },
  onShow() { syncTabBar(this) },
  onUnload() { this.scope?.close() },
  onPullDownRefresh() { void this.load(true).finally(() => wx.stopPullDownRefresh()) },
  onReachBottom() { if (!this.data.finished) void this.load(false) },
  async load(reset: boolean) {
    if (this.data.loading) return
    const current = reset ? 1 : this.data.current
    this.setData({ loading: true })
    try {
      const result = await this.scope?.run(listHotBlogs(current))
      if (!result) return
      const rows = result.data || []
      this.setData({ blogs: reset ? rows : [...this.data.blogs, ...rows], current: current + 1, finished: rows.length < 10 })
    } catch {
      if (reset) this.setData({ blogs: [], current: 1, finished: false })
    } finally { this.setData({ loading: false }) }
  },
  publish() { if (requireLogin()) wx.navigateTo({ url: '/package-blog/pages/publish/index' }) },
  openFollowing() { navigateToTab('/pages/following/index') },
  openBlog(event: WechatMiniprogram.CustomEvent<{ id: string }>) { wx.navigateTo({ url: `/package-blog/pages/detail/index?id=${event.detail.id}` }) },
  scope: undefined as ReturnType<typeof createRequestScope> | undefined
})
