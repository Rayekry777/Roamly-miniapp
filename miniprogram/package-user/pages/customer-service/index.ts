import { listMyCustomerServiceTickets } from "../../../api/customer-service";
import type { CustomerServiceTicket } from "../../../types";

const labels: Record<string, string> = {
  OPEN: "待平台认领",
  CLAIMED: "处理中",
  WAITING_CUSTOMER: "等待我回复",
  WAITING_MERCHANT: "处理中",
  WAITING_INTERNAL: "平台处理中",
  RESOLVED: "已解决",
  CLOSED: "已关闭",
};
type TicketItem = CustomerServiceTicket & {
  statusText: string;
  timeText: string;
};
Page({
  data: { items: [] as TicketItem[], loading: true, error: "" },
  onShow() {
    void this.load();
  },
  async load() {
    this.setData({ loading: true, error: "" });
    try {
      const result = await listMyCustomerServiceTickets();
      const items = (result.data?.items || []).map((item) => ({
        ...item,
        statusText: labels[item.status] || item.status,
        timeText: (item.lastMessageTime || item.createTime || "")
          .replace("T", " ")
          .slice(0, 16),
      }));
      this.setData({ items, loading: false });
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "工单加载失败",
      });
    }
  },
  create() {
    wx.navigateTo({ url: "/package-user/pages/customer-service/create" });
  },
  open(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (id)
      wx.navigateTo({
        url:
          "/package-user/pages/customer-service/detail?id=" +
          encodeURIComponent(id),
      });
  },
  retry() {
    void this.load();
  },
});
