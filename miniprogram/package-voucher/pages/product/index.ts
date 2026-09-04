import { loadVoucherProduct } from "../../../services/voucher-product";
import type { ShopSummary, VoucherProduct } from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { shopDetailUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";

Page({
  data: {
    product: null as VoucherProduct | null,
    shop: null as ShopSummary | null,
    loading: true,
    error: "",
    submitting: false,
  },
  onLoad(options) {
    this.productId = String(options.id || options.productId || "");
    this.scope = createRequestScope();
    if (!this.productId) {
      this.setData({ loading: false, error: "缺少团购商品 ID" });
      return;
    }
    void this.loadProduct();
  },
  onUnload() {
    this.scope?.close();
  },
  async loadProduct() {
    this.setData({ loading: true, error: "" });
    try {
      const detail = await this.scope?.run(loadVoucherProduct(this.productId));
      if (detail) {
        this.setData({
          product: detail.product,
          shop: detail.shop,
          loading: false,
        });
      }
    } catch (error) {
      this.setData({
        product: null,
        shop: null,
        loading: false,
        error: error instanceof Error ? error.message : "团购商品暂时加载失败",
      });
    }
  },
  openConfirm() {
    if (this.data.submitting || !this.data.product) return;
    if (
      !requireLogin(
        `/package-voucher/pages/product/index?id=${encodeURIComponent(this.productId)}`,
      )
    )
      return;
    wx.navigateTo({
      url: `/package-order/pages/confirm/index?id=${encodeURIComponent(this.productId)}`,
    });
  },
  retry() {
    void this.loadProduct();
  },
  openShop() {
    if (this.data.shop?.id) {
      wx.navigateTo({ url: shopDetailUrl(this.data.shop.id) });
    }
  },
  productId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
