import { listUserBlogs } from '../../../services/blog'
import { checkFollow, followUser } from '../../../services/follow'
import { getUser, getUserInfo } from '../../../services/user'
import { authStore } from '../../../store/auth'
import type { Blog, UserDTO, UserInfo } from '../../../types'
import { requireLogin } from '../../../utils/navigation'

Page({
  data: { user: null as UserDTO | null, info: null as UserInfo | null, blogs: [] as Blog[], following: false, loading: true, toggling: false },
  onLoad(options) { this.userId = options.id || ''; void this.load() },
  async load() {
    try {
      const publicData = await Promise.all([getUser(this.userId), getUserInfo(this.userId), listUserBlogs(this.userId, 1)])
      let following = false
      if (authStore.isLoggedIn()) following = Boolean((await checkFollow(this.userId)).data)
      this.setData({ user: publicData[0].data, info: publicData[1].data, blogs: publicData[2].data || [], following })
    } catch {
      this.setData({ user: null, info: null, blogs: [], following: false })
    } finally { this.setData({ loading: false }) }
  },
  async toggleFollow() {
    if (!requireLogin() || this.data.toggling) return
    this.setData({ toggling: true })
    try { await followUser(this.userId, !this.data.following); this.setData({ following: !this.data.following }); wx.showToast({ title: this.data.following ? '已关注' : '已取消关注', icon: 'none' }) }
    finally { this.setData({ toggling: false }) }
  },
  openBlog(event: WechatMiniprogram.CustomEvent<{ id: string }>) { wx.navigateTo({ url: `/package-blog/pages/detail/index?id=${event.detail.id}` }) },
  userId: ''
})
