import { ensureSelectedCity } from "../../services/city";
import {
  loadFeedPage,
  loadHomeSections,
  setAuthorFollowing,
  setPostLiked,
} from "../../services/feed";
import { authStore } from "../../store/auth";
import { feedStore, type HomeFeedMode } from "../../store/feed";
import type { PostCard, SectionSummary } from "../../types";
import {
  navigateToLogin,
  requireLogin,
  syncTabBar,
} from "../../utils/navigation";
import {
  postDetailUrl,
  sectionDetailUrl,
  userProfileUrl,
} from "../../utils/routes";
import { createRequestScope } from "../../utils/scope";

const PAGE_SIZE = 10;

Page({
  data: {
    mode: "RECOMMENDED" as HomeFeedMode,
    sections: [] as SectionSummary[],
    feedItems: [] as PostCard[],
    feedLoading: false,
    feedRefreshing: false,
    feedHasMore: true,
    feedError: "",
    sectionLoading: true,
    sectionError: "",
    loggedIn: authStore.isLoggedIn(),
    currentUserId: authStore.user?.id || "",
    likingIds: {} as Record<string, boolean>,
    followingIds: {} as Record<string, boolean>,
  },
  onLoad() {
    this.scope = createRequestScope();
    this.setData({ mode: feedStore.getMode() });
    this.syncCurrentFeed();
    void this.initializeHome();
  },
  onShow() {
    syncTabBar(this);
    const loggedIn = authStore.isLoggedIn();
    this.setData({
      loggedIn,
      currentUserId: authStore.user?.id || "",
    });

    if (!this.initialized) return;
    if (this.data.mode === "FOLLOWING" && loggedIn) {
      if (feedStore.shouldLoad("FOLLOWING")) {
        void this.loadFeed("FOLLOWING");
      }
    } else if (this.data.mode === "FOLLOWING") {
      feedStore.setMode("RECOMMENDED");
      this.setData({ mode: "RECOMMENDED" });
      this.syncCurrentFeed();
    }
    this.restoreScrollPosition();
  },
  onUnload() {
    this.scope?.close();
  },
  onPageScroll(event: WechatMiniprogram.Page.IPageScrollOption) {
    feedStore.setScrollTop(this.data.mode, event.scrollTop);
  },
  onReachBottom() {
    const state = feedStore.getState(this.data.mode);
    if (state.hasMore && !state.loading && !state.refreshing) {
      void this.loadFeed(this.data.mode);
    }
  },
  onPullDownRefresh() {
    void this.refreshCurrentFeed();
  },
  async initializeHome() {
    const sectionPromise = this.scope?.run(loadHomeSections());
    const cityPromise = this.scope?.run(ensureSelectedCity());
    const [sectionResult, cityResult] = await Promise.allSettled([
      sectionPromise,
      cityPromise,
    ]);

    if (sectionResult.status === "fulfilled" && sectionResult.value) {
      this.setData({
        sections: sectionResult.value,
        sectionLoading: false,
        sectionError: "",
      });
    } else {
      this.setData({
        sectionLoading: false,
        sectionError: "分区暂时加载失败",
      });
    }

    this.initialized = true;
    if (cityResult.status === "fulfilled" && cityResult.value) {
      this.cityCode = cityResult.value.code;
      if (feedStore.shouldLoad("RECOMMENDED")) {
        await this.loadFeed("RECOMMENDED");
      }
    } else {
      this.setData({ feedError: "当前暂无可用城市，请稍后重试" });
    }

    if (
      this.data.mode === "FOLLOWING" &&
      authStore.isLoggedIn() &&
      feedStore.shouldLoad("FOLLOWING")
    ) {
      await this.loadFeed("FOLLOWING");
    }
    this.restoreScrollPosition();
  },
  async loadFeed(mode: HomeFeedMode, refresh = false) {
    if (!feedStore.startLoading(mode, refresh)) return;
    if (mode === this.data.mode) {
      this.setData({ feedError: "" });
      this.syncCurrentFeed();
    }

    try {
      if (mode === "RECOMMENDED" && !this.cityCode) {
        const city = await this.scope?.run(ensureSelectedCity());
        if (!city) return;
        this.cityCode = city.code;
      }

      const current = feedStore.getState(mode);
      const page = await this.scope?.run(
        loadFeedPage(mode, {
          cityCode: this.cityCode,
          cursor:
            !refresh && current.items.length > 0
              ? current.nextCursor ?? undefined
              : undefined,
          offset:
            !refresh && current.items.length > 0
              ? current.nextOffset
              : undefined,
          size: PAGE_SIZE,
        }),
      );
      if (!page) return;
      feedStore.applyPage(mode, page, refresh);
    } catch (error) {
      feedStore.finishLoading(mode);
      if (mode === this.data.mode) {
        this.setData({ feedError: this.errorMessage(error) });
      }
    } finally {
      feedStore.finishLoading(mode);
      if (mode === this.data.mode) this.syncCurrentFeed();
    }
  },
  async refreshCurrentFeed() {
    try {
      await this.loadFeed(this.data.mode, true);
    } finally {
      wx.stopPullDownRefresh();
    }
  },
  switchMode(event: WechatMiniprogram.TouchEvent) {
    const mode = String(event.currentTarget.dataset.mode) as HomeFeedMode;
    if (mode === this.data.mode) return;

    feedStore.setMode(mode);
    this.setData({ mode, feedError: "" });
    this.syncCurrentFeed();
    this.restoreScrollPosition();

    if (mode === "FOLLOWING" && !authStore.isLoggedIn()) {
      navigateToLogin("/pages/home/index");
      return;
    }
    if (feedStore.shouldLoad(mode)) void this.loadFeed(mode);
  },
  retryFeed() {
    void this.loadFeed(this.data.mode, true);
  },
  retrySections() {
    if (this.data.sectionLoading) return;
    this.setData({ sectionLoading: true, sectionError: "" });
    void this.scope
      ?.run(loadHomeSections())
      .then((sections) => {
        if (sections) this.setData({ sections, sectionLoading: false });
      })
      .catch(() => {
        this.setData({
          sectionLoading: false,
          sectionError: "分区暂时加载失败",
        });
      });
  },
  openPost(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: postDetailUrl(event.detail.id) });
  },
  openComment(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({
      url: postDetailUrl(event.detail.id, { focusComposer: true }),
    });
  },
  openHighlight(
    event: WechatMiniprogram.CustomEvent<{
      postId: string;
      commentId: string;
    }>,
  ) {
    wx.navigateTo({
      url: postDetailUrl(event.detail.postId, {
        focusCommentId: event.detail.commentId,
      }),
    });
  },
  openAuthor(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: userProfileUrl(event.detail.id) });
  },
  openSection(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: sectionDetailUrl(event.detail.id) });
  },
  async toggleLike(
    event: WechatMiniprogram.CustomEvent<{ id: string; liked: boolean }>,
  ) {
    if (!requireLogin("/pages/home/index")) return;
    const { id, liked } = event.detail;
    if (this.data.likingIds[id]) return;

    const rollback = feedStore.optimisticallySetLiked(id, liked);
    this.setOperationState("likingIds", id, true);
    this.syncCurrentFeed();
    try {
      await setPostLiked(id, liked);
    } catch {
      rollback();
      this.syncCurrentFeed();
    } finally {
      this.setOperationState("likingIds", id, false);
    }
  },
  async toggleFollow(
    event: WechatMiniprogram.CustomEvent<{
      authorId: string;
      followed: boolean;
    }>,
  ) {
    if (!requireLogin("/pages/home/index")) return;
    const { authorId, followed } = event.detail;
    if (this.data.followingIds[authorId]) return;

    const rollback = feedStore.optimisticallySetFollowing(authorId, followed);
    this.setOperationState("followingIds", authorId, true);
    this.syncCurrentFeed();
    try {
      await setAuthorFollowing(authorId, followed);
    } catch {
      rollback();
      this.syncCurrentFeed();
    } finally {
      this.setOperationState("followingIds", authorId, false);
    }
  },
  loginForFollowing() {
    navigateToLogin("/pages/home/index");
  },
  syncCurrentFeed() {
    const state = feedStore.getState(this.data.mode);
    this.setData({
      feedItems: state.items,
      feedLoading: state.loading,
      feedRefreshing: state.refreshing,
      feedHasMore: state.hasMore,
    });
  },
  restoreScrollPosition() {
    const { scrollTop } = feedStore.getState(this.data.mode);
    setTimeout(() => wx.pageScrollTo({ scrollTop, duration: 0 }), 0);
  },
  setOperationState(
    field: "likingIds" | "followingIds",
    id: string,
    active: boolean,
  ) {
    this.setData({
      [field]: { ...this.data[field], [id]: active },
    });
  },
  errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "内容暂时加载失败";
  },
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
  cityCode: "",
  initialized: false,
});
