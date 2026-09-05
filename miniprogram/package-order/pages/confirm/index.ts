import { confirmOrder, createOrder } from "../../../services/order";
import { loadVoucherProduct } from "../../../services/voucher-product";
import type {
  ShopSummary,
  VoucherOrderConfirmation,
  VoucherProduct,
} from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { orderConfirmUrl, orderDetailUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";
import { session } from "../../../utils/session";

Page({
  data: {
    product: null as VoucherProduct | null,
    shop: null as ShopSummary | null,
    confirmation: null as VoucherOrderConfirmation | null,
    quantity: 1,
    loading: true,
    refreshing: false,
    submitting: false,
    createdOrderId: "",
    error: "",
  },
  onLoad(options) {
    this.productId = String(options.id || options.productId || "");
    this.scope = createRequestScope();
    if (!this.productId) {
      this.setData({ loading: false, error: "缺少团购商品 ID" });
      return;
    }
    if (!session.getToken()) {
      this.awaitingLogin = true;
      this.setData({ loading: false, error: "请先登录，登录后将返回确认订单" });
      requireLogin(orderConfirmUrl(this.productId));
      return;
    }
    void this.loadPage();
  },
  onShow() {
    if (this.awaitingLogin && session.getToken()) {
      this.awaitingLogin = false;
      void this.loadPage();
    }
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
      await this.refreshConfirmation(this.data.quantity || 1);
    } catch (error) {
      this.setData({
        product: null,
        shop: null,
        confirmation: null,
        error:
          error instanceof Error ? error.message : "订单确认加载失败，请重试",
      });
    } finally {
      this.setData({ loading: false });
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
            : "商品价格或库存已变化，请重新确认",
      });
    } finally {
      this.setData({ refreshing: false });
    }
  },
  decrease() {
    const min = this.data.confirmation?.minQuantity || 1;
    const next = Math.max(min, this.data.quantity - 1);
    if (next !== this.data.quantity) void this.refreshConfirmation(next);
  },
  increase() {
    const max = this.data.confirmation?.maxQuantity || 1;
    const next = Math.min(max, this.data.quantity + 1);
    if (next !== this.data.quantity) void this.refreshConfirmation(next);
  },
  async submit() {
    if (this.data.createdOrderId) {
      this.openOrder(this.data.createdOrderId);
      return;
    }
    if (this.data.submitting || this.data.refreshing || !this.data.confirmation)
      return;
    this.setData({ submitting: true, error: "" });
    try {
      const order = await createOrder(this.productId, this.data.quantity);
      this.setData({ createdOrderId: order.id });
      this.openOrder(order.id);
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
  openOrder(orderId: string) {
    wx.navigateTo({
      url: orderDetailUrl(orderId),
      fail: () =>
        this.setData({
          error: "订单已创建，但订单详情打开失败；请重试或前往“我的订单”查看",
        }),
    });
  },
  retry() {
    if (!session.getToken()) {
      requireLogin(orderConfirmUrl(this.productId));
      return;
    }
    if (this.data.product) void this.refreshConfirmation(this.data.quantity);
    else void this.loadPage();
  },
  productId: "",
  awaitingLogin: false,
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
