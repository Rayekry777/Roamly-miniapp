import { loadMyPostPage } from "../../../services/post";
import type { PostCard } from "../../../types";
import { postDetailUrl } from "../../../utils/routes";

Page({
  data: {
    posts: [] as PostCard[],
    page: 1,
    hasMore: true,
    loading: true,
    error: "",
  },
  onLoad() {
    void this.loadPosts(true);
  },
  onPullDownRefresh() {
    void this.loadPosts(true).finally(() => wx.stopPullDownRefresh());
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) void this.loadPosts(false);
  },
  async loadPosts(reset: boolean) {
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, error: reset ? "" : this.data.error });
    try {
      const result = await loadMyPostPage(page);
      const map = new Map(
        (reset ? [] : this.data.posts).map((post) => [post.id, post]),
      );
      result.items.forEach((post) => map.set(post.id, post));
      const posts = [...map.values()];
      this.setData({
        posts,
        page: page + 1,
        hasMore: posts.length < result.total && result.items.length > 0,
        error: "",
      });
    } catch (error) {
      this.setData({
        ...(reset ? { posts: [], page: 1, hasMore: true } : {}),
        error: error instanceof Error ? error.message : "我的动态暂时加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  openPost(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: postDetailUrl(String(event.detail.id)) });
  },
  retry() {
    void this.loadPosts(true);
  },
});
