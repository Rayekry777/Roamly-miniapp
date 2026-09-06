import { cancelOrder, loadMyOrders } from "../../../services/order";
import type { VoucherOrder, VoucherOrderStatusFilter } from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import { orderDetailUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";

const PAGE_SIZE = 10;

Page({
  data: {
    orders: [] as VoucherOrder[],
    visibleOrders: [] as VoucherOrder[],
    keyword: "",
    status: "ALL" as VoucherOrderStatusFilter,
    filters: [
      { value: "ALL", label: "全部订单" },
      { value: "PENDING_PAYMENT", label: "待付款" },
      { value: "PAID", label: "可使用" },
      { value: "REFUNDING", label: "退款/售后" },
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
        visibleOrders: filterOrders(orders, this.data.keyword),
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
    this.setData({
      status,
      orders: [],
      visibleOrders: [],
      page: 1,
      hasMore: true,
    });
    void this.loadOrders(true);
  },
  onKeyword(event: WechatMiniprogram.CustomEvent) {
    const detail = event.detail as unknown as string | { value: string };
    const keyword = typeof detail === "string" ? detail : detail.value;
    this.setData({
      keyword,
      visibleOrders: filterOrders(this.data.orders, keyword),
    });
  },
  search() {
    this.setData({
      visibleOrders: filterOrders(this.data.orders, this.data.keyword),
    });
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

function filterOrders(orders: VoucherOrder[], keyword: string): VoucherOrder[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return orders;
  return orders.filter((order) =>
    [order.productTitle, order.orderNo, order.id].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(normalized),
    ),
  );
}
