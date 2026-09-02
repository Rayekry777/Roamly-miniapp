import { listFollowBlogs } from '../../services/blog'
import { authStore } from '../../store/auth'
import type { Blog } from '../../types'
import { navigateToLogin, requireLogin, syncTabBar } from '../../utils/navigation'

Page({
  data: { blogs: [] as Blog[], lastId: Date.now(), offset: 0, loading: false, finished: false, loggedIn: authStore.isLoggedIn() },
  onShow() {
    syncTabBar(this)
    const loggedIn = authStore.isLoggedIn()
    this.setData({ loggedIn })
    if (loggedIn && !this.loaded) { this.loaded = true; void this.load() }
    if (!loggedIn) { this.loaded = false; this.setData({ blogs: [], loading: false, finished: false }) }
  },
  onPullDownRefresh() {
    if (!requireLogin('/pages/following/index')) { wx.stopPullDownRefresh(); return }
    this.setData({ blogs: [], lastId: Date.now(), offset: 0, finished: false })
    void this.load().finally(() => wx.stopPullDownRefresh())
  },
  onReachBottom() { if (this.data.loggedIn && !this.data.finished) void this.load() },
  async load() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const result = await listFollowBlogs(this.data.lastId, this.data.offset)
      const page = result.data
      if (!page?.list?.length) { this.setData({ finished: true }); return }
      this.setData({ blogs: [...this.data.blogs, ...page.list], lastId: page.minTime, offset: page.offset })
    } catch {
      this.loaded = false
      this.setData({ loggedIn: authStore.isLoggedIn() })
    } finally { this.setData({ loading: false }) }
  },
  login() { navigateToLogin('/pages/following/index') },
  openBlog(event: WechatMiniprogram.CustomEvent<{ id: string }>) { wx.navigateTo({ url: `/package-blog/pages/detail/index?id=${event.detail.id}` }) },
  goDiscover() { wx.switchTab({ url: '/pages/discover/index' }) },
  loaded: false
})
