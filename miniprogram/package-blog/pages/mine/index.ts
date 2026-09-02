import { listMyBlogs } from "../../../services/blog";
import type { Blog } from "../../../types";

Page({
  data: { blogs: [] as Blog[], current: 1, loading: false, finished: false },
  onLoad() {
    void this.load(true);
  },
  onPullDownRefresh() {
    void this.load(true).finally(() => wx.stopPullDownRefresh());
  },
  onReachBottom() {
    if (!this.data.finished) void this.load(false);
  },
  async load(reset: boolean) {
    if (this.data.loading) return;
    const current = reset ? 1 : this.data.current;
    this.setData({ loading: true });
    try {
      const result = await listMyBlogs(current);
      const rows = result.data || [];
      this.setData({
        blogs: reset ? rows : [...this.data.blogs, ...rows],
        current: current + 1,
        finished: rows.length < 10,
      });
    } catch {
      if (reset) this.setData({ blogs: [], current: 1, finished: false });
    } finally {
      this.setData({ loading: false });
    }
  },
  openBlog(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({
      url: `/package-blog/pages/detail/index?id=${event.detail.id}`,
    });
  },
  publish() {
    wx.navigateTo({ url: "/package-post/pages/publish/index" });
  },
});
