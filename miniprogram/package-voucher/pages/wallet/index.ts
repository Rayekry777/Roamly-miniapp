import { loadMyVoucher, loadMyVouchers } from "../../../services/user-voucher";
import type { UserVoucher, UserVoucherStatusFilter } from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { createRequestScope } from "../../../utils/scope";
import { requestVoucherRefund, issueVoucherQrToken } from "../../../api/refund";

const PAGE_SIZE = 10;

Page({
  data: {
    vouchers: [] as UserVoucher[],
    status: "ALL" as UserVoucherStatusFilter,
    filters: [
      { value: "ALL", label: "全部" },
      { value: "UNUSED", label: "未使用" },
      { value: "USED", label: "已使用" },
      { value: "EXPIRED", label: "已过期" },
      { value: "REFUNDED", label: "已退款" },
    ] as Array<{ value: UserVoucherStatusFilter; label: string }>,
    page: 1,
    hasMore: true,
    loading: true,
    error: "",
    qrVisible: false,
    qrToken: "",
    qrSeconds: 0,
    qrLoading: false,
  },
  onLoad(options) {
    this.scope = createRequestScope();
    this.voucherId = String(options.id || "");
    if (!requireLogin("/package-voucher/pages/wallet/index")) return;
    if (this.voucherId) {
      void this.loadDetail();
    } else {
      void this.loadList(true);
    }
  },
  onUnload() {
    this.stopQrTimer();
    this.scope?.close();
  },
  onHide() {
    this.stopQrTimer();
  },
  onShow() {
    if (this.data.qrVisible && this.qrVoucherId && this.data.qrSeconds <= 0) {
      void this.issueQr(this.qrVoucherId);
    }
  },
  onPullDownRefresh() {
    void this.loadList(true).finally(() => wx.stopPullDownRefresh());
  },
  onReachBottom() {
    if (!this.voucherId && this.data.hasMore && !this.data.loading)
      void this.loadList(false);
  },
  async loadList(reset: boolean) {
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, error: reset ? "" : this.data.error });
    try {
      const result = await this.scope?.run(
        loadMyVouchers({ page, size: PAGE_SIZE, status: this.data.status }),
      );
      if (!result) return;
      const current = reset ? [] : this.data.vouchers;
      const map = new Map(current.map((item) => [item.id, item]));
      result.items.forEach((item) => map.set(item.id, item));
      const vouchers = [...map.values()];
      this.setData({
        vouchers,
        page: page + 1,
        hasMore: vouchers.length < result.total && result.items.length > 0,
        error: "",
      });
    } catch (error) {
      this.setData({
        ...(reset ? { vouchers: [], page: 1, hasMore: true } : {}),
        error: error instanceof Error ? error.message : "券包暂时加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  async loadDetail() {
    this.setData({ loading: true, error: "" });
    try {
      const voucher = await this.scope?.run(loadMyVoucher(this.voucherId));
      if (voucher) this.setData({ vouchers: [voucher], loading: false });
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "券详情暂时加载失败",
      });
    }
  },
  selectStatus(event: WechatMiniprogram.TouchEvent) {
    const status = String(
      event.currentTarget.dataset.status,
    ) as UserVoucherStatusFilter;
    if (status === this.data.status) return;
    this.setData({ status, vouchers: [], page: 1, hasMore: true });
    void this.loadList(true);
  },
  retry() {
    if (this.voucherId) void this.loadDetail();
    else void this.loadList(true);
  },
  async refund(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const voucher = this.data.vouchers.find((item) => item.id === id);
    if (!voucher || voucher.status !== "UNUSED") return;
    const modal = await new Promise<boolean>((resolve) => wx.showModal({ title: "申请退款", content: "确认申请这张券的退款吗？", success: (r) => resolve(r.confirm), fail: () => resolve(false) }));
    if (!modal) return;
    try {
      const result = await requestVoucherRefund(id, "消费者申请退款", `refund-${id}-${Date.now()}`);
      if (!result.data) throw new Error("退款响应格式异常");
      wx.showToast({ title: "退款成功", icon: "success" });
      if (this.voucherId) void this.loadDetail(); else void this.loadList(true);
    } catch (error) { wx.showToast({ title: error instanceof Error ? error.message : "退款失败", icon: "none" }); }
  },
  async showQr(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (!id) return;
    this.qrVoucherId = id;
    this.setData({ qrVisible: true, qrToken: "", qrSeconds: 0, qrLoading: true });
    await this.issueQr(id);
  },
  async issueQr(id: string) {
    this.stopQrTimer();
    this.setData({ qrLoading: true });
    try {
      const result = await issueVoucherQrToken(id);
      if (!result.data?.token || !result.data.expiresAt) throw new Error("二维码响应格式异常");
      const seconds = Math.max(1, Math.ceil((Date.parse(result.data.expiresAt) - Date.now()) / 1000));
      this.setData({ qrToken: result.data.token, qrSeconds: seconds, qrLoading: false });
      this.startQrTimer();
    } catch (error) {
      this.setData({ qrLoading: false, qrToken: "", qrSeconds: 0 });
      wx.showToast({ title: error instanceof Error ? error.message : "二维码生成失败", icon: "none" });
    }
  },
  startQrTimer() {
    this.stopQrTimer();
    this.qrTimer = setInterval(() => {
      if (!this.data.qrVisible) return this.stopQrTimer();
      const seconds = this.data.qrSeconds - 1;
      if (seconds > 0) this.setData({ qrSeconds: seconds });
      else if (this.qrVoucherId) void this.issueQr(this.qrVoucherId);
    }, 1000);
  },
  stopQrTimer() {
    if (this.qrTimer) clearInterval(this.qrTimer);
    this.qrTimer = undefined;
  },
  closeQr() {
    this.stopQrTimer();
    this.setData({ qrVisible: false, qrToken: "", qrSeconds: 0, qrLoading: false });
    this.qrVoucherId = "";
  },
  noop() {},
  voucherId: "",
  qrVoucherId: "",
  qrTimer: undefined as ReturnType<typeof setInterval> | undefined,
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
