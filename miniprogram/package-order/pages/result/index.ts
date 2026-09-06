import { loadMyOrder } from "../../../services/order";
import { openVoucherPayment } from "../../../services/payment-flow";
import type { VoucherOrderDetail } from "../../../types";
import {
  orderDetailUrl,
  shopListUrl,
  voucherDetailUrl,
} from "../../../utils/routes";

Page({
  data: {
    loading: true,
    error: "",
    detail: null as VoucherOrderDetail | null,
    paying: false,
    paymentOutcome: "",
  },
  async onLoad(options) {
    this.orderId = String(options.id || "");
    this.setData({ paymentOutcome: String(options.payment || "") });
    await this.load();
  },
  async load() {
    if (!this.orderId)
      return this.setData({ loading: false, error: "缺少订单 ID" });
    this.setData({ loading: true, error: "" });
    try {
      this.setData({ detail: await loadMyOrder(this.orderId), loading: false });
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "订单加载失败",
      });
    }
  },
  async pay() {
    if (
      this.data.paying ||
      this.data.detail?.order.status !== "PENDING_PAYMENT"
    )
      return;
    this.setData({ paying: true });
    try {
      const result = await openVoucherPayment(this.orderId);
      this.setData({ paymentOutcome: result.outcome });
      await this.load();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "支付失败",
        icon: "none",
      });
    } finally {
      this.setData({ paying: false });
    }
  },
  openOrder() {
    wx.navigateTo({ url: orderDetailUrl(this.orderId) });
  },
  openShops() {
    const productId = this.data.detail?.order.productId;
    if (productId) wx.navigateTo({ url: shopListUrl({ productId }) });
  },
  openVoucher() {
    const id = this.data.detail?.vouchers?.[0]?.id;
    if (id) wx.navigateTo({ url: voucherDetailUrl(id) });
  },
  retry() {
    void this.load();
  },
  orderId: "",
});
