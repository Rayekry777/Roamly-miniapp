import { createOrder } from "../../../services/order";
import { loadVoucherProduct } from "../../../services/voucher-product";
import type { ShopSummary, VoucherProduct } from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { orderDetailUrl, shopDetailUrl } from "../../../utils/routes";
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
  async createOrder() {
    if (this.data.submitting || !this.data.product) return;
    if (
      !requireLogin(
        `/package-voucher/pages/product/index?id=${encodeURIComponent(this.productId)}`,
      )
    )
      return;
    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: "确认下单",
        content: `将创建 1 份「${this.data.product?.title || "团购商品"}」订单`,
        success: (result) => resolve(result.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirmed) return;
    this.setData({ submitting: true, error: "" });
    try {
      const order = await createOrder(this.productId);
      wx.navigateTo({ url: orderDetailUrl(order.id) });
    } catch (error) {
      this.setData({
        error:
          error instanceof Error ? error.message : "订单创建失败，请稍后重试",
      });
    } finally {
      this.setData({ submitting: false });
    }
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
