import { getBlog, likeBlog } from '../../../services/blog'
import type { Blog } from '../../../types'
import { splitImages } from '../../../utils/media'
import { requireLogin } from '../../../utils/navigation'

Page({
  data: { blog: null as Blog | null, images: [] as string[], blogDate: '刚刚', loading: true, liking: false },
  onLoad(options) { this.blogId = options.id || ''; void this.load() },
  async load() {
    try {
      const result = await getBlog(this.blogId)
      this.setData({ blog: result.data, images: splitImages(result.data?.images), blogDate: result.data?.createTime?.slice(0, 10) || '刚刚' })
    } catch {
      this.setData({ blog: null, images: [] })
    } finally { this.setData({ loading: false }) }
  },
  async toggleLike() {
    if (!requireLogin() || !this.data.blog || this.data.liking) return
    this.setData({ liking: true })
    try {
      await likeBlog(this.data.blog.id, Boolean(this.data.blog.likedByMe ?? this.data.blog.isLike))
      const isLike = !this.data.blog.isLike
      this.setData({ blog: { ...this.data.blog, isLike, liked: Math.max(0, (this.data.blog.liked || 0) + (isLike ? 1 : -1)) } })
    } finally { this.setData({ liking: false }) }
  },
  openAuthor() { if (this.data.blog) wx.navigateTo({ url: `/package-user/pages/profile/index?id=${this.data.blog.userId}` }) },
  blogId: ''
})
