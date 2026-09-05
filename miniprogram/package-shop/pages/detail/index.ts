import { loadShopDetail, loadShopPostPage } from "../../../services/shop";
import { listVoucherProducts } from "../../../services/voucher-product";
import { cityStore } from "../../../store/city";
import type { PostCard, Shop, VoucherProductListItem } from "../../../types";
import { postDetailUrl, voucherProductUrl } from "../../../utils/routes";
import { shopReviewsUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";

type ModuleStatus = "IDLE" | "LOADING" | "READY" | "ERROR";

Page({
  data: {
    shop: null as Shop | null,
    scoreText: "0.0",
    loading: true,
    error: "",
    vouchers: [] as VoucherProductListItem[],
    voucherStatus: "IDLE" as ModuleStatus,
    voucherError: "",
    posts: [] as PostCard[],
    postStatus: "IDLE" as ModuleStatus,
    postError: "",
  },
  onLoad(options) {
    this.shopId = String(options.id || "");
    this.scope = createRequestScope();
    if (!this.shopId) {
      this.setData({ loading: false, error: "缺少商户 ID" });
      return;
    }
    void this.loadShop();
  },
  onShow() {
    if (this.loaded && this.shopId) void this.loadShop();
  },
  onUnload() {
    this.scope?.close();
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  },
  async loadShop() {
    this.setData({ loading: true, error: "" });
    const location = cityStore.getState();
    try {
      const shop = await this.scope?.run(
        loadShopDetail(this.shopId, {
          longitude: location.longitude,
          latitude: location.latitude,
        }),
      );
      if (!shop) return;
      this.setData({
        shop,
        scoreText: shop.score.toFixed(1),
        loading: false,
      });
      this.loaded = true;
      this.observers.forEach((observer) => observer.disconnect());
      this.observers = [];
      wx.nextTick(() => this.observeLazyModules());
    } catch (error) {
      this.setData({
        shop: null,
        loading: false,
        error: error instanceof Error ? error.message : "商户暂时加载失败",
      });
    }
  },
  observeLazyModules() {
    if (this.observers.length || !this.data.shop) return;
    this.observeOnce("#voucher-section", () => void this.loadVouchers());
    this.observeOnce("#post-section", () => void this.loadPosts());
  },
  observeOnce(selector: string, action: () => void) {
    const observer = this.createIntersectionObserver({});
    this.observers.push(observer);
    observer.relativeToViewport({ bottom: 120 }).observe(selector, (result) => {
      if (result.intersectionRatio <= 0) return;
      observer.disconnect();
      action();
    });
  },
  async loadVouchers() {
    if (this.data.voucherStatus === "LOADING") return;
    this.setData({ voucherStatus: "LOADING", voucherError: "" });
    try {
      const products = await this.scope?.run(listVoucherProducts(this.shopId));
      if (!products) return;
      this.setData({
        vouchers: products.map((product) => ({
          product,
          shop: {
            id: this.data.shop?.id || this.shopId,
            name: this.data.shop?.name || "",
            cover: this.data.shop?.cover,
            address: this.data.shop?.address,
          },
          distance: this.data.shop?.distance,
          distanceText: this.data.shop?.distanceText || "",
        })),
        voucherStatus: "READY",
      });
    } catch (error) {
      this.setData({
        voucherStatus: "ERROR",
        voucherError:
          error instanceof Error ? error.message : "优惠信息暂时加载失败",
      });
    }
  },
  async loadPosts() {
    if (this.data.postStatus === "LOADING") return;
    this.setData({ postStatus: "LOADING", postError: "" });
    try {
      const result = await this.scope?.run(loadShopPostPage(this.shopId));
      if (!result) return;
      this.setData({ posts: result.items, postStatus: "READY" });
    } catch (error) {
      this.setData({
        postStatus: "ERROR",
        postError:
          error instanceof Error ? error.message : "商户相关动态暂时加载失败",
      });
    }
  },
  openVoucher(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    const id = String(event.detail.id || "");
    if (!id) return;
    wx.navigateTo({
      url: voucherProductUrl(id),
      fail: () =>
        wx.showToast({ title: "商品详情打开失败，请重试", icon: "none" }),
    });
  },
  openPost(event: WechatMiniprogram.TouchEvent) {
    const postId = String(event.currentTarget.dataset.id || "");
    if (postId) wx.navigateTo({ url: postDetailUrl(postId) });
  },
  openReviews() {
    wx.navigateTo({ url: shopReviewsUrl(this.shopId) });
  },
  retryShop() {
    void this.loadShop();
  },
  retryVouchers() {
    void this.loadVouchers();
  },
  retryPosts() {
    void this.loadPosts();
  },
  shopId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
  observers: [] as WechatMiniprogram.IntersectionObserver[],
  loaded: false,
});
