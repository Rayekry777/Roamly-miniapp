import {
  deleteTemporaryImage,
  uploadTemporaryImage,
} from "../../../services/media";
import {
  createReview,
  loadReviewPage,
  normalizeRequest,
  removeReview,
  updateReview,
} from "../../../services/review";
import { authStore } from "../../../store/auth";
import type { ShopReview, ReviewSort, UploadedMedia } from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { ApiError } from "../../../utils/request";
import { choosePostImages } from "../../../utils/post-media";
import { createRequestScope } from "../../../utils/scope";

const PAGE_SIZE = 10;

Page({
  data: {
    shopId: "",
    reviews: [] as ShopReview[],
    sort: "LATEST" as ReviewSort,
    sortOptions: [
      { value: "LATEST", label: "最新" },
      { value: "HIGHEST_SCORE", label: "高分" },
    ] as Array<{ value: ReviewSort; label: string }>,
    page: 1,
    hasMore: true,
    loading: true,
    refreshing: false,
    error: "",
    loggedIn: authStore.isLoggedIn(),
    formVisible: false,
    editing: false,
    editingReviewId: "",
    score: 0,
    content: "",
    media: [] as UploadedMedia[],
    submitting: false,
    formError: "",
  },
  onLoad(options) {
    this.shopId = String(options.id || "");
    this.setData({ shopId: this.shopId });
    this.scope = createRequestScope();
    if (!this.shopId) {
      this.setData({ loading: false, error: "缺少商户 ID" });
      return;
    }
    void this.loadReviews(true);
  },
  onShow() {
    this.setData({ loggedIn: authStore.isLoggedIn() });
  },
  onUnload() {
    this.scope?.close();
  },
  onPullDownRefresh() {
    void this.refreshReviews();
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) void this.loadReviews(false);
  },
  async loadReviews(reset: boolean) {
    if (!this.shopId || (!reset && this.data.loading)) return;
    const sequence = reset ? ++this.requestSequence : this.requestSequence;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, error: reset ? "" : this.data.error });
    try {
      const result = await this.scope?.run(
        loadReviewPage(this.shopId, {
          page,
          size: PAGE_SIZE,
          sort: this.data.sort,
        }),
      );
      if (!result || sequence !== this.requestSequence) return;
      const reviews = reset
        ? result.items
        : mergeReviews(this.data.reviews, result.items);
      this.setData({
        reviews,
        page: page + 1,
        hasMore: reviews.length < result.total && result.items.length > 0,
        error: "",
      });
    } catch (error) {
      if (sequence !== this.requestSequence) return;
      this.setData({
        ...(reset ? { reviews: [], page: 1, hasMore: true } : {}),
        error: this.errorMessage(error),
      });
    } finally {
      if (sequence === this.requestSequence) this.setData({ loading: false });
    }
  },
  async refreshReviews() {
    this.setData({ refreshing: true });
    try {
      await this.loadReviews(true);
    } finally {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }
  },
  selectSort(event: WechatMiniprogram.TouchEvent) {
    const sort = String(event.currentTarget.dataset.sort) as ReviewSort;
    if (sort === this.data.sort) return;
    this.setData({ sort, reviews: [], page: 1, hasMore: true });
    void this.loadReviews(true);
  },
  startCreate() {
    const redirect = `/package-shop/pages/reviews/index?id=${encodeURIComponent(this.shopId)}`;
    if (!requireLogin(redirect)) return;
    this.setData({
      formVisible: true,
      editing: false,
      editingReviewId: "",
      score: 0,
      content: "",
      media: [],
      formError: "",
    });
  },
  editReview(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const review = this.data.reviews.find((item) => item.id === id);
    if (!review) return;
    this.setData({
      formVisible: true,
      editing: true,
      editingReviewId: review.id,
      score: review.score,
      content: review.content,
      media: review.media.map((asset) => ({
        localPath: asset.url,
        asset,
        status: "DONE",
        bound: true,
      })),
      formError: "",
    });
  },
  closeForm() {
    if (this.data.submitting) return;
    this.setData({ formVisible: false, formError: "" });
  },
  selectScore(event: WechatMiniprogram.TouchEvent) {
    this.setData({ score: Number(event.currentTarget.dataset.score || 0) });
  },
  onContent(event: WechatMiniprogram.CustomEvent) {
    const detail = event.detail as unknown as string | { value: string };
    this.setData({
      content: typeof detail === "string" ? detail : detail.value,
    });
  },
  async addImages() {
    const available = 9 - this.data.media.length;
    if (this.data.submitting || available <= 0) return;
    try {
      const selection = await choosePostImages(available);
      if (selection.rejectedMessages[0]) {
        wx.showToast({ title: selection.rejectedMessages[0], icon: "none" });
      }
      const added = selection.files.map<UploadedMedia>((file) => ({
        localPath: file.tempFilePath,
        status: "WAITING",
      }));
      this.setData({ media: [...this.data.media, ...added] });
      await Promise.all(added.map((item) => this.uploadOne(item.localPath)));
    } catch (error) {
      if (!this.isUserCancel(error)) {
        wx.showToast({ title: "选择图片失败", icon: "none" });
      }
    }
  },
  async uploadOne(localPath: string) {
    this.updateMedia(localPath, { status: "UPLOADING", error: undefined });
    try {
      const asset = await uploadTemporaryImage(localPath);
      const stillExists = this.data.media.some(
        (item) => item.localPath === localPath,
      );
      if (!stillExists) {
        await deleteTemporaryImage(asset.id).catch(() => undefined);
        return;
      }
      this.updateMedia(localPath, { asset, status: "DONE" });
    } catch (error) {
      this.updateMedia(localPath, {
        status: "FAILED",
        error: this.errorMessage(error),
      });
    }
  },
  retryImage(event: WechatMiniprogram.CustomEvent<{ path: string }>) {
    void this.uploadOne(event.detail.path);
  },
  async removeImage(event: WechatMiniprogram.CustomEvent<{ path: string }>) {
    const path = event.detail.path;
    const item = this.data.media.find((media) => media.localPath === path);
    this.setData({
      media: this.data.media.filter((media) => media.localPath !== path),
    });
    if (item?.asset && !item.bound) {
      await deleteTemporaryImage(item.asset.id).catch(() => undefined);
    }
  },
  async submit() {
    if (this.data.submitting) return;
    try {
      if (this.data.media.some((item) => item.status !== "DONE")) {
        throw new Error("请等待图片上传完成");
      }
      const request = normalizeRequest({
        score: this.data.score,
        content: this.data.content,
        mediaIds: this.data.media.map((item) => item.asset!.id),
      });
      this.setData({ submitting: true, formError: "" });
      const review = this.data.editing
        ? await updateReview(this.shopId, request)
        : await createReview(this.shopId, request);
      this.setData({
        formVisible: false,
        submitting: false,
        formError: "",
        reviews: this.data.editing
          ? this.data.reviews.map((item) =>
              item.id === review.id ? review : item,
            )
          : [review, ...this.data.reviews],
      });
      wx.showToast({
        title: this.data.editing ? "点评已更新" : "点评已发布",
        icon: "success",
      });
    } catch (error) {
      const message =
        error instanceof ApiError && error.code === "REVIEW_ALREADY_EXISTS"
          ? "你已经点评过该商户，可在列表中编辑"
          : this.errorMessage(error);
      this.setData({ formError: message, submitting: false });
      if (error instanceof ApiError && error.statusCode === 409) {
        void this.loadReviews(true);
      }
    }
  },
  async deleteReview() {
    if (!this.data.editing || this.data.submitting) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: "删除点评",
        content: "删除后将无法恢复，确定继续吗？",
        success: (result) => resolve(result.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirmed) return;
    this.setData({ submitting: true });
    try {
      await removeReview(this.shopId);
      this.setData({ formVisible: false, submitting: false });
      await this.loadReviews(true);
      wx.showToast({ title: "点评已删除", icon: "success" });
    } catch (error) {
      this.setData({ submitting: false, formError: this.errorMessage(error) });
    }
  },
  updateMedia(localPath: string, patch: Partial<UploadedMedia>) {
    this.setData({
      media: this.data.media.map((item) =>
        item.localPath === localPath ? { ...item, ...patch } : item,
      ),
    });
  },
  noop() {},
  retry() {
    void this.loadReviews(true);
  },
  errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "点评暂时加载失败";
  },
  isUserCancel(error: unknown): boolean {
    return Boolean(
      error &&
        typeof error === "object" &&
        "errMsg" in error &&
        /cancel/i.test(String((error as { errMsg?: string }).errMsg)),
    );
  },
  shopId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
  requestSequence: 0,
});

function mergeReviews(
  current: ShopReview[],
  incoming: ShopReview[],
): ShopReview[] {
  const reviews = new Map(current.map((review) => [review.id, review]));
  incoming.forEach((review) => reviews.set(review.id, review));
  return [...reviews.values()];
}
