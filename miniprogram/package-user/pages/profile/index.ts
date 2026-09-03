import { loadUserPostPage } from "../../../services/post";
import { checkFollow, followUser } from "../../../services/follow";
import { getUser, getUserInfo } from "../../../services/user";
import { authStore } from "../../../store/auth";
import type { PostCard, UserDTO, UserInfo } from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { postDetailUrl } from "../../../utils/routes";

Page({
  data: {
    user: null as UserDTO | null,
    info: null as UserInfo | null,
    posts: [] as PostCard[],
    postsError: "",
    following: false,
    loading: true,
    toggling: false,
  },
  onLoad(options) {
    this.userId = String(options.id || "");
    void this.load();
  },
  async load() {
    try {
      const [userResult, infoResult, postsResult] = await Promise.allSettled([
        getUser(this.userId),
        getUserInfo(this.userId),
        loadUserPostPage(this.userId, 1),
      ]);
      if (
        userResult.status !== "fulfilled" ||
        infoResult.status !== "fulfilled"
      ) {
        throw new Error("用户资料暂时无法加载");
      }
      const following = authStore.isLoggedIn()
        ? Boolean((await checkFollow(this.userId)).data)
        : false;
      this.setData({
        user: userResult.value.data,
        info: infoResult.value.data,
        posts:
          postsResult.status === "fulfilled" ? postsResult.value.items : [],
        postsError:
          postsResult.status === "fulfilled" ? "" : "动态接口暂时不可用",
        following,
      });
    } catch {
      this.setData({ user: null, info: null, posts: [], following: false });
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
