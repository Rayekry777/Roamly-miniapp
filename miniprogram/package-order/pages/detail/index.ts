import { cancelOrder, loadMyOrder } from "../../../services/order";
import { listMyRefunds } from "../../../api/refund";
import { openVoucherPayment } from "../../../services/payment-flow";
import type {
  ShopSummary,
  UserVoucher,
  VoucherOrder,
  VoucherProduct,
} from "../../../types";
import {
  refundDetailUrl,
  refundUrl,
  shopDetailUrl,
  voucherDetailUrl,
  voucherProductUrl,
} from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";

Page({
  data: {
    order: null as VoucherOrder | null,
    product: null as VoucherProduct | null,
    shop: null as ShopSummary | null,
    vouchers: [] as UserVoucher[],
    hasUsableVoucher: false,
    hasRefundableVoucher: false,
    refundId: "",
    voucherExpireText: "",
    loading: true,
    error: "",
    cancelling: false,
    paying: false,
    countdownText: "",
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
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  },
  async loadOrder() {
    this.setData({ loading: true, error: "" });
    try {
      const detail = await this.scope?.run(loadMyOrder(this.orderId));
      if (detail) {
        let refundId = "";
        if (
          detail.order.status === "REFUNDING" ||
          detail.order.status === "REFUNDED"
        ) {
          try {
            const refunds = await this.scope?.run(
              listMyRefunds({ page: 1, size: 20 }),
            );
            const matched = refunds?.data?.items?.find(
              (refund) => String(refund.orderId) === String(detail.order.id),
            );
            if (matched?.id !== undefined) refundId = String(matched.id);
          } catch {
            // The order remains usable when the optional refund timeline request fails.
          }
        }
        this.setData({
          order: detail.order,
          product: detail.product,
          shop: detail.shop,
          vouchers: detail.vouchers,
          hasUsableVoucher: detail.vouchers.some(
            (voucher) =>
              voucher.status === "UNUSED" ||
              voucher.status === "PARTIALLY_USED",
          ),
          hasRefundableVoucher: detail.vouchers.some(
            (voucher) => voucher.status === "UNUSED",
          ),
          refundId,
          voucherExpireText: detail.vouchers[0]?.expireTime || "",
          loading: false,
        });
        this.startCountdown(detail.serverTime, detail.paymentExpireTime);
      }
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "订单暂时加载失败",
      });
    }
  },
  startCountdown(serverTime: string, expireTime?: string) {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (!expireTime) return;
    const offset = new Date(serverTime).getTime() - Date.now();
    const tick = () => {
      const remain = new Date(expireTime).getTime() - (Date.now() + offset);
      if (remain <= 0) {
        this.setData({ countdownText: "支付已超时，正在刷新" });
        clearInterval(this.countdownTimer);
        void this.loadOrder();
        return;
      }
      const total = Math.floor(remain / 1000);
      this.setData({
        countdownText: `剩余 ${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
      });
    };
    tick();
    this.countdownTimer = setInterval(tick, 1000);
  },
  async pay() {
    if (
      !this.data.order ||
      this.data.order.status !== "PENDING_PAYMENT" ||
      this.data.paying
    )
      return;
    this.setData({ paying: true, error: "" });
    try {
      const result = await openVoucherPayment(this.orderId);
      if (result.outcome === "CANCELLED") return;
      await this.loadOrder();
      wx.showToast({
        title: result.outcome === "SUCCESS" ? "支付成功" : "模拟支付失败",
        icon: result.outcome === "SUCCESS" ? "success" : "none",
      });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "支付失败",
      });
    } finally {
      this.setData({ paying: false });
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
  openRefund() {
    const id = this.data.vouchers.find((item) => item.status === "UNUSED")?.id;
    if (id) wx.navigateTo({ url: refundUrl(id) });
  },
  openVoucher() {
    const id = this.data.vouchers.find(
      (item) => item.status === "UNUSED" || item.status === "PARTIALLY_USED",
    )?.id;
    if (id) wx.navigateTo({ url: voucherDetailUrl(id) });
  },
  openRefundDetail() {
    if (this.data.refundId)
      wx.navigateTo({ url: refundDetailUrl(this.data.refundId) });
  },
  openProduct() {
    if (this.data.product?.id)
      wx.navigateTo({ url: voucherProductUrl(this.data.product.id) });
  },
  orderId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
  countdownTimer: undefined as ReturnType<typeof setInterval> | undefined,
});
