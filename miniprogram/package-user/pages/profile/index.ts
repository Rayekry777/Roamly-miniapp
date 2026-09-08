import { loadUserPostPage } from "../../../services/post";
import { checkFollow, followUser } from "../../../services/follow";
import { getPublicProfile } from "../../../services/user";
import { authStore } from "../../../store/auth";
import type { PostCard, PublicUserProfile } from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { postDetailUrl } from "../../../utils/routes";

Page({
  data: {
    user: null as PublicUserProfile | null,
    posts: [] as PostCard[],
    postsError: "",
    following: false,
    loading: true,
    toggling: false,
    currentUserId: authStore.user?.id || "",
  },
  onLoad(options) {
    this.userId = String(options.id || "");
    void this.load();
  },
  async load() {
    try {
      const [userResult, postsResult] = await Promise.allSettled([
        getPublicProfile(this.userId),
        loadUserPostPage(this.userId, 1),
      ]);
      if (userResult.status !== "fulfilled" || !userResult.value.data) {
        throw new Error("用户资料暂时无法加载");
      }
      const following = authStore.isLoggedIn()
        ? Boolean((await checkFollow(this.userId)).data)
        : false;
      this.setData({
        user: userResult.value.data,
        currentUserId: authStore.user?.id || "",
        posts:
          postsResult.status === "fulfilled" ? postsResult.value.items : [],
        postsError:
          postsResult.status === "fulfilled" ? "" : "动态接口暂时不可用",
        following,
      });
    } catch {
      this.setData({ user: null, posts: [], following: false });
    } finally {
      this.setData({ loading: false });
    }
  },
  async toggleFollow() {
    if (!requireLogin() || this.data.toggling) return;
    this.setData({ toggling: true });
    try {
      await followUser(this.userId, !this.data.following);
      this.setData({ following: !this.data.following });
      wx.showToast({
        title: this.data.following ? "已关注" : "已取消关注",
        icon: "none",
      });
    } finally {
      this.setData({ toggling: false });
    }
  },
  openPost(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: postDetailUrl(String(event.detail.id)) });
  },
  userId: "",
});
