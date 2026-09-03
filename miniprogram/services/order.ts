import * as orderApi from "../api/order";
import type {
  PageResult,
  VoucherOrder,
  VoucherOrderResponse,
  VoucherOrderStatusFilter,
} from "../types";
import { formatAmount } from "./voucher-product";

export async function createOrder(productId: string): Promise<VoucherOrder> {
  const result = await orderApi.createVoucherOrder(String(productId), {
    quantity: 1,
  });
  if (!result.data) throw new Error("订单创建结果缺少内容");
  return normalizeOrder(result.data);
}

export async function loadMyOrders(
  query: {
    page?: number;
    size?: number;
    status?: VoucherOrderStatusFilter;
  } = {},
): Promise<PageResult<VoucherOrder>> {
  const result = await orderApi.listMyOrders(query);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("订单接口尚未完成升级，请稍后重试");
  }
  return { ...result.data, items: result.data.items.map(normalizeOrder) };
}

export async function loadMyOrder(orderId: string): Promise<VoucherOrder> {
  const result = await orderApi.getMyOrder(String(orderId));
  if (!result.data) throw new Error("订单不存在或无权查看");
  return normalizeOrder(result.data);
}

export async function cancelOrder(orderId: string): Promise<void> {
  await orderApi.cancelMyOrder(String(orderId));
}

export function normalizeOrder(value: VoucherOrderResponse): VoucherOrder {
  return {
    ...value,
    id: String(value.id),
    orderNo: String(value.orderNo || value.id),
    shopId: String(value.shopId),
    productId: String(value.productId),
    unitAmount: Number(value.unitAmount) || 0,
    totalAmount: Number(value.totalAmount) || 0,
    payAmount: Number(value.payAmount) || 0,
    unitAmountText: formatAmount(value.unitAmount),
    totalAmountText: formatAmount(value.totalAmount),
    payAmountText: formatAmount(value.payAmount),
    statusText: orderStatusText(value.status),
  };
}

export function orderStatusText(status: VoucherOrder["status"]): string {
  return {
    PENDING_PAYMENT: "待支付",
    PAID: "已支付",
    CANCELLED: "已取消",
    REFUNDING: "退款中",
    REFUNDED: "已退款",
  }[status];
}
