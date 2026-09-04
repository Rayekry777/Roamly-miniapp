import { confirmOrder, createOrder } from "../../../services/order";
import { loadVoucherProduct } from "../../../services/voucher-product";
import type {
  ShopSummary,
  VoucherOrderConfirmation,
  VoucherProduct,
} from "../../../types";
import { orderDetailUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";

Page({
  data: {
    product: null as VoucherProduct | null,
    shop: null as ShopSummary | null,
    confirmation: null as VoucherOrderConfirmation | null,
    quantity: 1,
    loading: true,
    refreshing: false,
    submitting: false,
    error: "",
  },
  onLoad(options) {
    this.productId = String(options.id || options.productId || "");
    this.scope = createRequestScope();
    if (!this.productId) {
      this.setData({ loading: false, error: "缺少团购商品 ID" });
      return;
    }
    void this.loadPage();
  },
  onUnload() {
    this.scope?.close();
  },
  async loadPage() {
    this.setData({ loading: true, error: "" });
    try {
      const detail = await this.scope?.run(loadVoucherProduct(this.productId));
      if (!detail) return;
      this.setData({ product: detail.product, shop: detail.shop });
      await this.refreshConfirmation(1);
      this.setData({ loading: false });
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "订单确认加载失败",
      });
    }
  },
  async refreshConfirmation(quantity: number) {
    this.setData({ refreshing: true, error: "" });
    try {
      const confirmation = await this.scope?.run(
        confirmOrder(this.productId, quantity),
      );
      if (confirmation)
        this.setData({ confirmation, quantity: confirmation.quantity });
    } catch (error) {
      this.setData({
        confirmation: null,
        error:
          error instanceof Error
            ? error.message
            : "商品价格或库存已变化，请重试",
      });
    } finally {
      this.setData({ refreshing: false });
    }
  },
  decrease() {
    const next = Math.max(1, this.data.quantity - 1);
    if (next !== this.data.quantity) void this.refreshConfirmation(next);
  },
  increase() {
    const max = this.data.confirmation?.maxQuantity || 1;
    const next = Math.min(max, this.data.quantity + 1);
    if (next !== this.data.quantity) void this.refreshConfirmation(next);
  },
  async submit() {
    if (this.data.submitting || this.data.refreshing || !this.data.confirmation)
      return;
    this.setData({ submitting: true, error: "" });
    try {
      const order = await createOrder(this.productId, this.data.quantity);
      wx.navigateTo({ url: orderDetailUrl(order.id) });
    } catch (error) {
      this.setData({
        error:
          error instanceof Error ? error.message : "订单创建失败，请重新确认",
      });
      await this.refreshConfirmation(this.data.quantity);
    } finally {
      this.setData({ submitting: false });
    }
  },
  retry() {
    void this.loadPage();
  },
  productId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
