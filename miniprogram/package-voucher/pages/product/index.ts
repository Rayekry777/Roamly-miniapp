import {
  listVoucherProducts,
  loadVoucherProduct,
} from "../../../services/voucher-product";
import type {
  ShopSummary,
  VoucherProduct,
  VoucherProductListItem,
} from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { orderConfirmUrl, shopDetailUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";

Page({
  data: {
    product: null as VoucherProduct | null,
    shop: null as ShopSummary | null,
    related: [] as VoucherProductListItem[],
    loading: true,
    error: "",
    navigating: false,
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
  onShow() {
    this.setData({ navigating: false });
  },
  onUnload() {
    this.scope?.close();
  },
  async loadProduct() {
    this.setData({ loading: true, error: "" });
    try {
      const detail = await this.scope?.run(loadVoucherProduct(this.productId));
      if (!detail) return;
      this.setData({
        product: detail.product,
        shop: detail.shop,
        loading: false,
      });
      void this.loadRelated(detail.shop, detail.product.id);
    } catch (error) {
      this.setData({
        product: null,
        shop: null,
        related: [],
        loading: false,
        error: error instanceof Error ? error.message : "团购商品暂时加载失败",
      });
    }
  },
  async loadRelated(shop: ShopSummary, currentId: string) {
    try {
      const products = await this.scope?.run(listVoucherProducts(shop.id));
      if (!products) return;
      this.setData({
        related: products
          .filter((product) => product.id !== currentId)
          .slice(0, 4)
          .map((product) => ({ product, shop, distanceText: "" })),
      });
    } catch {
      this.setData({ related: [] });
    }
  },
  openConfirm() {
    const product = this.data.product;
    if (this.data.navigating || !product || product.status !== "ON_SALE")
      return;
    const url = orderConfirmUrl(this.productId);
    if (!requireLogin(url)) return;
    this.setData({ navigating: true });
    wx.navigateTo({
      url,
      fail: () => {
        this.setData({ navigating: false });
        wx.showToast({ title: "确认订单页打开失败，请重试", icon: "none" });
      },
    });
  },
  retry() {
    void this.loadProduct();
  },
  openShop() {
    if (!this.data.shop?.id) return;
    wx.navigateTo({
      url: shopDetailUrl(this.data.shop.id),
      fail: () =>
        wx.showToast({ title: "门店页打开失败，请重试", icon: "none" }),
    });
  },
  openRelated(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    const id = event.detail.id;
    if (!id) return;
    wx.navigateTo({
      url: `/package-voucher/pages/product/index?id=${encodeURIComponent(id)}`,
      fail: () =>
        wx.showToast({ title: "商品详情打开失败，请重试", icon: "none" }),
    });
  },
  productId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
