import {
  ensureDiscoveryContext,
  loadAvailableCities,
} from "../../../services/city";
import { setAuthorFollowing, setPostLiked } from "../../../services/feed";
import {
  loadSectionDetail,
  loadSectionPostPage,
  setSectionFollowing,
} from "../../../services/section";
import { authStore } from "../../../store/auth";
import { cityStore } from "../../../store/city";
import { syncCityPreference } from "../../../services/city";
import { sectionStore } from "../../../store/section";
import type {
  City,
  PostCard,
  SectionDetail,
  SectionPostSort,
} from "../../../types";
import { navigateToLogin, requireLogin } from "../../../utils/navigation";
import {
  postDetailUrl,
  sectionDetailUrl,
  userProfileUrl,
} from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";

const PAGE_SIZE = 10;

Page({
  data: {
    section: null as SectionDetail | null,
    detailLoading: true,
    detailError: "",
    sort: "LATEST" as SectionPostSort,
    items: [] as PostCard[],
    feedLoading: false,
    feedRefreshing: false,
    feedHasMore: true,
    feedError: "",
    selectedCity: null as City | null,
    cityPickerVisible: false,
    cityLoading: false,
    cities: [] as City[],
    loggedIn: authStore.isLoggedIn(),
    currentUserId: authStore.user?.id || "",
    sectionFollowing: false,
    likingIds: {} as Record<string, boolean>,
    followingIds: {} as Record<string, boolean>,
  },
  onLoad(options: Record<string, string | undefined>) {
    this.sectionId = String(options.id || "");
    this.scope = createRequestScope();
    if (!this.sectionId) {
      this.setData({
        detailLoading: false,
        detailError: "分区参数无效",
      });
      return;
    }
    const cached = sectionStore.getDetail(this.sectionId);
    if (cached) this.setData({ section: cached, detailLoading: false });
    const sort = sectionStore.getActiveSort(this.sectionId);
    this.setData({ sort });
    void this.initializePage();
  },
  onShow() {
    const loggedIn = authStore.isLoggedIn();
    const sessionChanged = this.lastLoggedIn !== loggedIn;
    const selectedCity = cityStore.getState().selectedCity;
    const cityChanged = selectedCity?.code !== this.data.selectedCity?.code;
    this.lastLoggedIn = loggedIn;
    this.setData({
      loggedIn,
      currentUserId: authStore.user?.id || "",
      ...(selectedCity ? { selectedCity } : {}),
    });
    this.syncDetail();
    this.syncFeed();

    if (loggedIn && this.resumeFollowIntent()) return;
    if (sessionChanged && this.sectionId) {
      void Promise.all([this.refreshDetail(), this.loadPosts(true)]);
      return;
    }
    if (cityChanged && this.isDailySection()) {
      this.syncFeed();
      if (
        sectionStore.shouldLoadFeed(
          this.sectionId,
          this.feedCityCode(),
          this.data.sort,
        )
      ) {
        void this.loadPosts();
      }
    }
  },
  onUnload() {
    this.scope?.close();
  },
  onPageScroll(event: WechatMiniprogram.Page.IPageScrollOption) {
    if (!this.sectionId) return;
    sectionStore.setScrollTop(
      this.sectionId,
      this.feedCityCode(),
      this.data.sort,
      event.scrollTop,
    );
  },
  onReachBottom() {
    const state = this.currentFeedState();
    if (state?.hasMore && !state.loading && !state.refreshing) {
      void this.loadPosts();
    }
  },
  onPullDownRefresh() {
    void this.refreshPage();
  },
  async initializePage() {
    const cityPromise = this.scope?.run(ensureDiscoveryContext());
    const detailPromise = sectionStore.shouldLoadDetail(this.sectionId)
      ? this.scope?.run(loadSectionDetail(this.sectionId))
      : Promise.resolve(sectionStore.getDetail(this.sectionId));
    const [cityResult, detailResult] = await Promise.allSettled([
      cityPromise,
      detailPromise,
    ]);

    if (cityResult.status === "fulfilled" && cityResult.value) {
      this.setData({ selectedCity: cityResult.value });
    }
    if (detailResult.status === "fulfilled" && detailResult.value) {
      sectionStore.applyDetail(detailResult.value);
      this.setData({ detailError: "" });
      this.syncDetail();
      this.applyPendingFollowIntent();
    } else {
      this.setData({
        detailLoading: false,
        detailError: this.errorMessage(
          detailResult.status === "rejected" ? detailResult.reason : undefined,
          "分区详情加载失败",
        ),
      });
      return;
    }

    if (this.isDailySection() && !this.data.selectedCity) {
      this.setData({ feedError: "当前暂无可用城市，请稍后重试" });
      return;
    }
    this.syncFeed();
    if (
      sectionStore.shouldLoadFeed(
        this.sectionId,
        this.feedCityCode(),
        this.data.sort,
      )
    ) {
      await this.loadPosts();
    }
    this.restoreScrollPosition();
  },
  async refreshPage() {
    try {
      await Promise.all([this.refreshDetail(), this.loadPosts(true)]);
    } finally {
      wx.stopPullDownRefresh();
    }
  },
  async refreshDetail() {
    if (!this.sectionId) return;
    this.setData({ detailError: "" });
    try {
      const detail = await this.scope?.run(loadSectionDetail(this.sectionId));
      if (detail) sectionStore.applyDetail(detail);
      this.syncDetail();
    } catch (error) {
      this.setData({
        detailError: this.errorMessage(error, "分区详情加载失败"),
      });
    }
  },
  async loadPosts(refresh = false) {
    if (!this.sectionId) return;
    const cityCode = this.feedCityCode();
    const sort = this.data.sort;
    if (this.isDailySection() && !cityCode) {
      this.setData({ feedError: "请先选择城市" });
      return;
    }
    if (
      !sectionStore.startFeedLoading(this.sectionId, cityCode, sort, refresh)
    ) {
      return;
    }
    this.setData({ feedError: "" });
    this.syncFeed();
    try {
      const current = sectionStore.getFeedState(this.sectionId, cityCode, sort);
      const page = await this.scope?.run(
        loadSectionPostPage(this.sectionId, {
          sort,
          cityCode: cityCode || undefined,
          cursor:
            !refresh && current.items.length > 0
              ? (current.nextCursor ?? undefined)
              : undefined,
          offset:
            !refresh && current.items.length > 0
              ? current.nextOffset
              : undefined,
          size: PAGE_SIZE,
        }),
      );
      if (page) {
        sectionStore.applyFeedPage(
          this.sectionId,
          cityCode,
          sort,
          page,
          refresh,
        );
      }
    } catch (error) {
      this.setData({
        feedError: this.errorMessage(error, "分区动态加载失败"),
      });
    } finally {
      sectionStore.finishFeedLoading(this.sectionId, cityCode, sort);
      this.syncFeed();
    }
  },
  switchSort(event: WechatMiniprogram.TouchEvent) {
    const sort = String(event.currentTarget.dataset.sort) as SectionPostSort;
    if (sort === this.data.sort || (sort !== "LATEST" && sort !== "HOT")) {
      return;
    }
    sectionStore.setActiveSort(this.sectionId, sort);
    this.setData({ sort, feedError: "" });
    this.syncFeed();
    this.restoreScrollPosition();
    if (
      sectionStore.shouldLoadFeed(this.sectionId, this.feedCityCode(), sort)
    ) {
      void this.loadPosts();
    }
  },
  retryDetail() {
    this.setData({ detailLoading: true, detailError: "" });
    void this.initializePage();
  },
  retryFeed() {
    void this.loadPosts(true);
  },
  async toggleSectionFollow() {
    const section = this.data.section;
    if (!section || this.data.sectionFollowing) return;
    if (!authStore.isLoggedIn()) {
      sectionStore.rememberFollowIntent(section.id);
      navigateToLogin(sectionDetailUrl(section.id));
      return;
    }
    await this.applySectionFollowing(!section.followedByMe);
  },
  async applySectionFollowing(followed: boolean) {
    const rollback = sectionStore.optimisticallySetSectionFollowing(
      this.sectionId,
      followed,
    );
    this.setData({ sectionFollowing: true });
    this.syncDetail();
    this.syncFeed();
    try {
      await setSectionFollowing(this.sectionId, followed);
    } catch {
      rollback();
      this.syncDetail();
      this.syncFeed();
    } finally {
      this.setData({ sectionFollowing: false });
    }
  },
  resumeFollowIntent(): boolean {
    if (!sectionStore.consumeFollowIntent(this.sectionId)) return false;
    this.pendingFollowIntent = true;
    this.applyPendingFollowIntent();
    return true;
  },
  applyPendingFollowIntent() {
    const section = this.data.section;
    if (!this.pendingFollowIntent || !section) return;
    this.pendingFollowIntent = false;
    if (!section.followedByMe) {
      void this.applySectionFollowing(true).then(() =>
        Promise.all([this.refreshDetail(), this.loadPosts(true)]),
      );
    }
  },
  async openCityPicker() {
    if (!this.isDailySection() || this.data.cityLoading) return;
    this.setData({ cityLoading: true });
    try {
      const cities = await this.scope?.run(loadAvailableCities());
      if (cities) {
        const location = cityStore.getState();
        this.setData({
          cities: cities.map((city) => ({
            ...city,
            isCurrentLocation:
              location.selectionMode === "REAL_LOCATION" &&
              location.selectedCity?.code === city.code,
          })),
          cityPickerVisible: true,
        });
      }
    } catch (error) {
      wx.showToast({
        title: this.errorMessage(error, "城市列表加载失败"),
        icon: "none",
      });
    } finally {
      this.setData({ cityLoading: false });
    }
  },
  closeCityPicker() {
    this.setData({ cityPickerVisible: false });
  },
  noop() {},
  selectCity(event: WechatMiniprogram.TouchEvent) {
    const code = String(event.currentTarget.dataset.code || "");
    const city = this.data.cities.find((item) => item.code === code);
    if (!city) return;
    const changed = city.code !== this.data.selectedCity?.code;
    const currentLocation = cityStore.getState();
    // 再次选择当前真实定位城市时保持 REAL_LOCATION，不清除区县上下文。
    if (
      currentLocation.selectionMode === "REAL_LOCATION" &&
      currentLocation.selectedCity?.code === city.code
    ) {
      this.setData({ cityPickerVisible: false });
      return;
    }
    cityStore.select(city);
    syncCityPreference(city.code);
    this.setData({
      selectedCity: city,
      cityPickerVisible: false,
      feedError: "",
    });
    if (!changed) return;
    this.syncFeed();
    this.restoreScrollPosition();
    if (
      sectionStore.shouldLoadFeed(
        this.sectionId,
        this.feedCityCode(),
        this.data.sort,
      )
    ) {
      void this.loadPosts();
    }
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
    if (event.detail.id === this.sectionId) {
      wx.pageScrollTo({ scrollTop: 0, duration: 200 });
      return;
    }
    wx.navigateTo({ url: sectionDetailUrl(event.detail.id) });
  },
  async toggleLike(
    event: WechatMiniprogram.CustomEvent<{ id: string; liked: boolean }>,
  ) {
    if (!requireLogin(sectionDetailUrl(this.sectionId))) return;
    const { id, liked } = event.detail;
    if (this.data.likingIds[id]) return;
    const rollback = sectionStore.optimisticallySetPostLiked(id, liked);
    this.setOperationState("likingIds", id, true);
    this.syncFeed();
    try {
      await setPostLiked(id, liked);
    } catch {
      rollback();
      this.syncFeed();
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
    if (!requireLogin(sectionDetailUrl(this.sectionId))) return;
    const { authorId, followed } = event.detail;
    if (this.data.followingIds[authorId]) return;
    const rollback = sectionStore.optimisticallySetAuthorFollowing(
      authorId,
      followed,
    );
    this.setOperationState("followingIds", authorId, true);
    this.syncFeed();
    try {
      await setAuthorFollowing(authorId, followed);
    } catch {
      rollback();
      this.syncFeed();
    } finally {
      this.setOperationState("followingIds", authorId, false);
    }
  },
  syncDetail() {
    if (!this.sectionId) return;
    const section = sectionStore.getDetail(this.sectionId) || null;
    this.setData({ section, detailLoading: false });
  },
  syncFeed() {
    if (!this.sectionId) return;
    const state = this.currentFeedState();
    if (!state) return;
    this.setData({
      items: state.items,
      feedLoading: state.loading,
      feedRefreshing: state.refreshing,
      feedHasMore: state.hasMore,
    });
  },
  currentFeedState() {
    if (!this.sectionId) return undefined;
    return sectionStore.getFeedState(
      this.sectionId,
      this.feedCityCode(),
      this.data.sort,
    );
  },
  restoreScrollPosition() {
    const scrollTop = this.currentFeedState()?.scrollTop || 0;
    setTimeout(() => wx.pageScrollTo({ scrollTop, duration: 0 }), 0);
  },
  feedCityCode(): string {
    return this.isDailySection() ? this.data.selectedCity?.code || "" : "";
  },
  isDailySection(): boolean {
    return this.data.section?.code === "ROAM_DAILY";
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
  errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  },
  sectionId: "",
  lastLoggedIn: authStore.isLoggedIn(),
  pendingFollowIntent: false,
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
