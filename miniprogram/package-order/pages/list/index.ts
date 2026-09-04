import { cancelOrder, loadMyOrders } from "../../../services/order";
import type { VoucherOrder, VoucherOrderStatusFilter } from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { orderDetailUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";

const PAGE_SIZE = 10;

Page({
  data: {
    orders: [] as VoucherOrder[],
    status: "ALL" as VoucherOrderStatusFilter,
    filters: [
      { value: "ALL", label: "全部" },
      { value: "PENDING_PAYMENT", label: "待支付" },
      { value: "PAID", label: "已支付" },
      { value: "CANCELED", label: "已取消" },
      { value: "REFUNDED", label: "退款" },
    ] as Array<{ value: VoucherOrderStatusFilter; label: string }>,
    page: 1,
    hasMore: true,
    loading: true,
    error: "",
    cancellingId: "",
  },
  onLoad() {
    this.scope = createRequestScope();
    if (requireLogin("/package-order/pages/list/index"))
      void this.loadOrders(true);
  },
  onUnload() {
    this.scope?.close();
  },
  onPullDownRefresh() {
    void this.loadOrders(true).finally(() => wx.stopPullDownRefresh());
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) void this.loadOrders(false);
  },
  async loadOrders(reset: boolean) {
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, error: reset ? "" : this.data.error });
    try {
      const result = await this.scope?.run(
        loadMyOrders({ page, size: PAGE_SIZE, status: this.data.status }),
      );
      if (!result) return;
      const map = new Map(
        (reset ? [] : this.data.orders).map((item) => [item.id, item]),
      );
      result.items.forEach((item) => map.set(item.id, item));
      const orders = [...map.values()];
      this.setData({
        orders,
        page: page + 1,
        hasMore: orders.length < result.total && result.items.length > 0,
        error: "",
      });
    } catch (error) {
      this.setData({
        ...(reset ? { orders: [], page: 1, hasMore: true } : {}),
        error: error instanceof Error ? error.message : "订单暂时加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  selectStatus(event: WechatMiniprogram.TouchEvent) {
    const status = String(
      event.currentTarget.dataset.status,
    ) as VoucherOrderStatusFilter;
    if (status === this.data.status) return;
    this.setData({ status, orders: [], page: 1, hasMore: true });
    void this.loadOrders(true);
  },
  openOrder(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (id) wx.navigateTo({ url: orderDetailUrl(id) });
  },
  async cancel(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const order = this.data.orders.find((item) => item.id === id);
    if (!order || order.status !== "PENDING_PAYMENT" || this.data.cancellingId)
      return;
    const confirmed = await new Promise<boolean>((resolve) =>
      wx.showModal({
        title: "取消订单",
        content: "确定取消待支付订单吗？",
        success: (result) => resolve(result.confirm),
        fail: () => resolve(false),
      }),
    );
    if (!confirmed) return;
    this.setData({ cancellingId: id });
    try {
      await cancelOrder(id);
      await this.loadOrders(true);
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "取消订单失败",
      });
    } finally {
      this.setData({ cancellingId: "" });
    }
  },
  retry() {
    void this.loadOrders(true);
  },
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
