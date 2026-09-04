import { cancelOrder, loadMyOrder } from "../../../services/order";
import type {
  ShopSummary,
  VoucherOrder,
  VoucherProduct,
} from "../../../types";
import { shopDetailUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";

Page({
  data: {
    order: null as VoucherOrder | null,
    product: null as VoucherProduct | null,
    shop: null as ShopSummary | null,
    loading: true,
    error: "",
    cancelling: false,
  },
  onLoad(options) {
    this.orderId = String(options.id || "");
    this.scope = createRequestScope();
    if (!this.orderId) {
      this.setData({ loading: false, error: "缺少订单 ID" });
      return;
    }
    void this.loadOrder();
  },
  onUnload() {
    this.scope?.close();
  },
  async loadOrder() {
    this.setData({ loading: true, error: "" });
    try {
      const detail = await this.scope?.run(loadMyOrder(this.orderId));
      if (detail) {
        this.setData({
          order: detail.order,
          product: detail.product,
          shop: detail.shop,
          loading: false,
        });
      }
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "订单暂时加载失败",
      });
    }
  },
  async cancel() {
    if (
      !this.data.order ||
      this.data.order.status !== "PENDING_PAYMENT" ||
      this.data.cancelling
    )
      return;
    this.setData({ cancelling: true });
    try {
      await cancelOrder(this.orderId);
      await this.loadOrder();
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "取消订单失败",
      });
    } finally {
      this.setData({ cancelling: false });
    }
  },
  retry() {
    void this.loadOrder();
  },
  openShop() {
    if (this.data.shop?.id) {
      wx.navigateTo({ url: shopDetailUrl(this.data.shop.id) });
    }
  },
  orderId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
