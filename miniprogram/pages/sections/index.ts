import { loadSections, setSectionFollowing } from "../../services/section";
import { authStore } from "../../store/auth";
import { sectionStore } from "../../store/section";
import type { SectionSummary } from "../../types";
import { navigateToLogin, syncTabBar } from "../../utils/navigation";
import { sectionDetailUrl } from "../../utils/routes";
import { createRequestScope } from "../../utils/scope";

Page({
  data: {
    sections: [] as SectionSummary[],
    loading: true,
    refreshing: false,
    error: "",
    loggedIn: authStore.isLoggedIn(),
    followingIds: {} as Record<string, boolean>,
  },
  onLoad() {
    this.scope = createRequestScope();
    this.syncList();
    if (sectionStore.shouldLoadList()) void this.loadSectionList();
  },
  onShow() {
    syncTabBar(this);
    const loggedIn = authStore.isLoggedIn();
    const sessionChanged = this.lastLoggedIn !== loggedIn;
    this.lastLoggedIn = loggedIn;
    this.setData({ loggedIn });
    this.syncList();

    if (loggedIn && this.resumeFollowIntent()) return;
    if (sessionChanged && sectionStore.shouldLoadList(0)) {
      void this.loadSectionList(true);
    }
  },
  onUnload() {
    this.scope?.close();
  },
  onPullDownRefresh() {
    void this.refreshSections();
  },
  async loadSectionList(refresh = false) {
    if (!sectionStore.startListLoading(refresh)) return;
    this.setData({ error: "" });
    this.syncList();
    try {
      const sections = await this.scope?.run(loadSections());
      if (sections) {
        sectionStore.applyList(sections);
        this.syncList();
        this.applyPendingFollowIntent();
      }
    } catch (error) {
      this.setData({ error: this.errorMessage(error) });
    } finally {
      sectionStore.finishListLoading();
      this.syncList();
    }
  },
  async refreshSections() {
    try {
      await this.loadSectionList(true);
    } finally {
      wx.stopPullDownRefresh();
    }
  },
  retrySections() {
    void this.loadSectionList(true);
  },
  openSection(event: WechatMiniprogram.TouchEvent) {
    const sectionId = String(event.currentTarget.dataset.id || "");
    if (sectionId) wx.navigateTo({ url: sectionDetailUrl(sectionId) });
  },
  async toggleFollow(event: WechatMiniprogram.TouchEvent) {
    const sectionId = String(event.currentTarget.dataset.id || "");
    const currentFollowed = event.currentTarget.dataset.followed;
    const followed = !(currentFollowed === true || currentFollowed === "true");
    if (!sectionId || this.data.followingIds[sectionId]) return;

    if (!authStore.isLoggedIn()) {
      sectionStore.rememberFollowIntent(sectionId);
      navigateToLogin("/pages/sections/index");
      return;
    }
    await this.applyFollowing(sectionId, followed);
  },
  async applyFollowing(sectionId: string, followed: boolean) {
    const rollback = sectionStore.optimisticallySetSectionFollowing(
      sectionId,
      followed,
    );
    this.setOperationState(sectionId, true);
    this.syncList();
    try {
      await setSectionFollowing(sectionId, followed);
    } catch {
      rollback();
      this.syncList();
    } finally {
      this.setOperationState(sectionId, false);
    }
  },
  resumeFollowIntent(): boolean {
    const sectionId = sectionStore.takeFollowIntent();
    if (!sectionId) return false;
    this.pendingFollowSectionId = sectionId;
    this.applyPendingFollowIntent();
    return true;
  },
  applyPendingFollowIntent() {
    const sectionId = this.pendingFollowSectionId;
    if (!sectionId) return;
    const sections = sectionStore.getListState().items;
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;
    this.pendingFollowSectionId = "";
    if (!section.followedByMe) {
      void this.applyFollowing(section.id, true).then(() =>
        this.loadSectionList(true),
      );
    }
  },
  syncList() {
    const state = sectionStore.getListState();
    this.setData({
      sections: state.items,
      loading: state.loading,
      refreshing: state.refreshing,
    });
  },
  setOperationState(sectionId: string, active: boolean) {
    this.setData({
      followingIds: {
        ...this.data.followingIds,
        [sectionId]: active,
      },
    });
  },
  errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "分区暂时加载失败";
  },
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
  lastLoggedIn: authStore.isLoggedIn(),
  pendingFollowSectionId: "",
});
