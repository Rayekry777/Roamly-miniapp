import { loadMyVoucher, loadMyVouchers } from "../../../services/user-voucher";
import type { UserVoucher, UserVoucherStatusFilter } from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { refundUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";
import { issueVoucherQrToken } from "../../../api/refund";
import {
  Ecc,
  QrCode,
} from "../../../miniprogram_npm/tdesign-miniprogram/common/shared/qrcode/qrcodegen";

const PAGE_SIZE = 10;

type QrCell = { id: string; dark: boolean };
type QrRow = { id: string; cells: QrCell[] };

const createQrRows = (value: string): QrRow[] =>
  QrCode.encodeText(value, Ecc.MEDIUM)
    .getModules()
    .map((cells, rowIndex) => ({
      id: `row-${rowIndex}`,
      cells: cells.map((dark, cellIndex) => ({
        id: `${rowIndex}-${cellIndex}`,
        dark,
      })),
    }));

Page({
  data: {
    vouchers: [] as UserVoucher[],
    status: "ALL" as UserVoucherStatusFilter,
    filters: [
      { value: "ALL", label: "全部" },
      { value: "UNUSED", label: "未使用" },
      { value: "PARTIALLY_USED", label: "部分使用" },
      { value: "USED", label: "已使用" },
      { value: "EXPIRED", label: "已过期" },
      { value: "REFUNDING", label: "退款中" },
      { value: "REFUNDED", label: "已退款" },
    ] as Array<{ value: UserVoucherStatusFilter; label: string }>,
    page: 1,
    hasMore: true,
    loading: true,
    error: "",
    qrVisible: false,
    qrToken: "",
    qrVoucherCode: "",
    qrRows: [] as QrRow[],
    qrLoading: false,
    pageStyle: "overflow: auto;",
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
    this.scope?.close();
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
    wx.navigateTo({ url: refundUrl(id) });
  },
  async showQr(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (!id) return;
    this.qrVoucherId = id;
    const voucher = this.data.vouchers.find((item) => item.id === id);
    this.setData({
      qrVisible: true,
      qrToken: "",
      qrVoucherCode: voucher?.voucherCode || "",
      qrRows: [],
      qrLoading: true,
      pageStyle: "overflow: hidden;",
    });
    await this.issueQr(id);
  },
  async issueQr(id: string) {
    this.setData({ qrLoading: true });
    try {
      const result = await issueVoucherQrToken(id);
      if (!result.data?.token) throw new Error("二维码响应格式异常");
      this.setData({
        qrToken: result.data.token,
        qrRows: createQrRows(result.data.token),
        qrLoading: false,
      });
    } catch (error) {
      this.setData({ qrLoading: false, qrToken: "", qrRows: [] });
      wx.showToast({
        title: error instanceof Error ? error.message : "二维码生成失败",
        icon: "none",
      });
    }
  },
  closeQr() {
    this.setData({
      qrVisible: false,
      qrToken: "",
      qrVoucherCode: "",
      qrRows: [],
      qrLoading: false,
      pageStyle: "overflow: auto;",
    });
    this.qrVoucherId = "";
  },
  retryQr() {
    if (this.qrVoucherId && !this.data.qrLoading)
      void this.issueQr(this.qrVoucherId);
  },
  noop() {
    return;
  },
  voucherId: "",
  qrVoucherId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
