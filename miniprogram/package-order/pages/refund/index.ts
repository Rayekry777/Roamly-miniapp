import { requestOrderRefund } from "../../../api/refund";
import { loadMyVoucher } from "../../../services/user-voucher";
import { loadMyOrder } from "../../../services/order";
import type { UserVoucher } from "../../../types";
import { refundDetailUrl } from "../../../utils/routes";

const reasons = [
  { code: "PLAN_CHANGED", label: "计划有变没时间消费" },
  { code: "BOUGHT_WRONG", label: "买多了/买错了" },
  { code: "SAFETY_CONCERN", label: "担心安全问题" },
  { code: "REGRET", label: "后悔了，不想要了" },
  { code: "MISTOOK_DELIVERY", label: "误以为是外卖" },
  { code: "RULES_UNCLEAR", label: "没看清使用规则" },
  { code: "QUEUE_TOO_LONG", label: "预约不上/排队太久" },
  { code: "CANNOT_CONTACT_SHOP", label: "联系不上商家" },
  { code: "SHOP_NOT_SERVING", label: "商家营业但不接待" },
  { code: "OTHER", label: "其他" },
];
Page({
  data: {
    voucherId: "",
    voucher: null as UserVoucher | null,
    orderId: "",
    refundAmountText: "",
    reasonCode: "",
    reasonLabel: "",
    draftReasonCode: "",
    draftReasonLabel: "",
    reasons,
    reasonVisible: false,
    note: "",
    submitting: false,
    loading: true,
    error: "",
  },
  async onLoad(options) {
    const voucherId = String(options.id || "");
    this.setData({ voucherId });
    try {
      const voucher = await loadMyVoucher(voucherId);
      const order = await loadMyOrder(voucher.orderId);
      const amount =
        order.order.quantity > 0
          ? order.order.payAmount / order.order.quantity
          : order.order.payAmount;
      this.setData({
        voucher,
        orderId: voucher.orderId,
        refundAmountText: (amount / 100).toFixed(2),
        loading: false,
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "券信息加载失败",
      });
    }
  },
  chooseReason() {
    this.setData({
      reasonVisible: true,
      draftReasonCode: this.data.reasonCode,
      draftReasonLabel: this.data.reasonLabel,
    });
  },
  selectReason(event: WechatMiniprogram.TouchEvent) {
    const code = String(event.currentTarget.dataset.code || "");
    const selected = reasons.find((item) => item.code === code);
    this.setData({
      draftReasonCode: code,
      draftReasonLabel: selected?.label || "",
    });
  },
  closeReason() {
    this.setData({ reasonVisible: false });
  },
  confirmReason() {
    this.setData({
      reasonCode: this.data.draftReasonCode,
      reasonLabel: this.data.draftReasonLabel,
      reasonVisible: false,
    });
  },
  noop() {},
  goWallet() {
    wx.navigateBack();
  },
  onNote(event: WechatMiniprogram.Input) {
    this.setData({ note: String(event.detail.value || "") });
  },
  async submit() {
    if (!this.data.voucherId || !this.data.reasonCode || this.data.submitting)
      return wx.showToast({ title: "请选择退款原因", icon: "none" });
    this.setData({ submitting: true });
    try {
      const result = await requestOrderRefund(
        {
          orderId: this.data.orderId,
          voucherIds: [this.data.voucherId],
          reasonCode: this.data.reasonCode,
          description: this.data.note,
        },
        `refund-${this.data.voucherId}-${Date.now()}`,
      );
      if (result.data?.id)
        wx.redirectTo({ url: refundDetailUrl(String(result.data.id)) });
      else wx.navigateBack();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "退款申请失败",
        icon: "none",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
