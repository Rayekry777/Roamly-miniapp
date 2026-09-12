import { getMyRefund, getMyRefundTimeline } from "../../../api/refund";
import type {
  RefundTimelineEvent,
  VoucherRefundResponse,
} from "../../../types";

Page({
  data: {
    loading: true,
    error: "",
    refund: null as
      | (VoucherRefundResponse & {
          decisionText?: string;
          statusText?: string;
        })
      | null,
    timeline: [] as Array<
      RefundTimelineEvent & {
        key: string;
        statusText: string;
        timeText: string;
      }
    >,
  },
  async onLoad(options) {
    this.refundId = String(options.id || "");
    await this.load();
  },
  async load() {
    if (!this.refundId)
      return this.setData({ loading: false, error: "缺少退款单号" });
    try {
      const [result, timelineResult] = await Promise.all([
        getMyRefund(this.refundId),
        getMyRefundTimeline(this.refundId),
      ]);
      const refund = result.data
        ? {
            ...result.data,
            decisionText: decisionStatusText(result.data.decisionStatus),
            statusText: refundStatusText(result.data),
            amountText: (Number(result.data.amount || 0) / 100).toFixed(2),
          }
        : null;
      const timeline = (timelineResult.data || []).map((item, index) => ({
        ...item,
        key: `${item.type}-${item.occurredAt || index}`,
        statusText: refundEventStatusText(item.status),
        timeText: (item.occurredAt || "").replace("T", " ").slice(0, 19),
      }));
      this.setData({ refund, timeline, loading: false });
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
  openCustomerService() {
    if (!this.data.refund) return;
    wx.navigateTo({
      url:
        "/package-user/pages/customer-service/create?refundId=" +
        encodeURIComponent(this.refundId) +
        "&orderId=" +
        encodeURIComponent(String(this.data.refund.orderId)) +
        "&voucherId=" +
        encodeURIComponent(String(this.data.refund.voucherId || "")) +
        "&subject=" +
        encodeURIComponent("退款进度咨询"),
    });
  },
  refundId: "",
});

function refundStatusText(refund: VoucherRefundResponse): string {
  const execution = refund.executionStatus;
  const decision = refund.decisionStatus;
  return (
    (
      {
        PENDING_REVIEW: "等待平台审核",
        REJECTED: "退款已拒绝",
        WAITING_EXECUTION: "等待退款执行",
        PROCESSING: "退款处理中",
        RETRY_WAITING: "等待重新执行",
        SUCCESS: "退款成功",
        PARTIAL_SUCCESS: "部分退款成功",
        FAILED: "退款失败",
        MANUAL_REQUIRED: "转人工处理",
      } as Record<string, string>
    )[decision === "REJECTED" ? decision : execution || refund.status] ||
    "退款处理中"
  );
}

function decisionStatusText(status?: string): string {
  return (
    (
      {
        PENDING_REVIEW: "等待平台审核",
        AUTO_APPROVED: "系统自动通过",
        MANUAL_APPROVED: "平台人工通过",
        REJECTED: "审核未通过",
      } as Record<string, string>
    )[status || ""] || "等待平台审核"
  );
}

function refundEventStatusText(status?: string): string {
  return (
    (
      {
        PENDING_REVIEW: "等待平台审核",
        AUTO_APPROVED: "系统自动通过",
        MANUAL_APPROVED: "平台人工通过",
        REJECTED: "审核未通过",
        WAITING_EXECUTION: "等待退款执行",
        PROCESSING: "退款处理中",
        RETRY_WAITING: "等待重新执行",
        SUCCESS: "退款成功",
        PARTIAL_SUCCESS: "部分退款成功",
        FAILED: "退款失败",
        MANUAL_REQUIRED: "转人工处理",
      } as Record<string, string>
    )[status || ""] || "状态已更新"
  );
}
