import * as orderApi from "../api/order";
import type {
  PageResult,
  VoucherOrder,
  VoucherOrderDetail,
  VoucherOrderResponse,
  VoucherOrderStatusFilter,
} from "../types";
import { formatAmount } from "./voucher-product";
import { normalizeVoucherProduct } from "./voucher-product";
import { adaptShopSummary } from "./post-card";

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
    throw new Error("订单列表响应格式异常，请稍后重试");
  }
  return { ...result.data, items: result.data.items.map(normalizeOrder) };
}

export async function loadMyOrder(orderId: string): Promise<VoucherOrderDetail> {
  const result = await orderApi.getMyOrder(String(orderId));
  if (!result.data?.order || !result.data.product || !result.data.shop) {
    throw new Error("订单详情响应格式异常，请稍后重试");
  }
  return {
    order: normalizeOrder(result.data.order),
    product: normalizeVoucherProduct(result.data.product),
    shop: adaptShopSummary(result.data.shop),
  };
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
    CANCELED: "已取消",
    REFUNDING: "退款中",
    REFUNDED: "已退款",
  }[status];
}
