import { getMyRefund } from "../../../api/refund";
import type { VoucherRefundResponse } from "../../../types";

Page({
  data: {
    loading: true,
    error: "",
    refund: null as (VoucherRefundResponse & { statusText?: string }) | null,
  },
  async onLoad(options) {
    this.refundId = String(options.id || "");
    await this.load();
  },
  async load() {
    if (!this.refundId)
      return this.setData({ loading: false, error: "缺少退款单号" });
    try {
      const result = await getMyRefund(this.refundId);
      const refund = result.data
        ? {
            ...result.data,
            statusText: refundStatusText(result.data.status),
            amountText: (Number(result.data.amount || 0) / 100).toFixed(2),
          }
        : null;
      this.setData({ refund, loading: false });
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "退款详情加载失败",
      });
    }
  },
  retry() {
    void this.load();
  },
  openOrder() {
    if (this.data.refund?.orderId)
      wx.navigateTo({
        url: `/package-order/pages/detail/index?id=${encodeURIComponent(String(this.data.refund.orderId))}`,
      });
  },
  refundId: "",
});

function refundStatusText(status?: string): string {
  return (
    (
      {
        REQUESTED: "退款中",
        PROCESSING: "退款中",
        SUCCEEDED: "退款成功",
        FAILED: "退款失败",
        REJECTED: "退款被拒",
      } as Record<string, string>
    )[status || ""] || "退款处理中"
  );
}
