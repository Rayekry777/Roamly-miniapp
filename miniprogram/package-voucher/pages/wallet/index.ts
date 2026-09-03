import { loadMyVoucher, loadMyVouchers } from "../../../services/user-voucher";
import type { UserVoucher, UserVoucherStatusFilter } from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { createRequestScope } from "../../../utils/scope";

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
  voucherId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
