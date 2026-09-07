import * as orderApi from "../api/order";
import type {
  PageResult,
  VoucherOrder,
  VoucherOrderDetail,
  VoucherOrderConfirmation,
  VoucherOrderConfirmationResponse,
  VoucherOrderResponse,
  VoucherOrderStatusFilter,
  VoucherProductType,
  VoucherPaymentResponse,
  UserVoucher,
} from "../types";
import { formatAmount } from "./voucher-product";
import { normalizeVoucherProduct } from "./voucher-product";
import { adaptShopSummary } from "./post-card";
import { imageUrl } from "../utils/media";

export async function createOrder(
  productId: string,
  quantity = 1,
): Promise<VoucherOrder> {
  const idempotencyKey = `miniapp-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const result = await orderApi.createVoucherOrder(
    String(productId),
    {
      quantity,
    },
    idempotencyKey,
  );
  if (!result.data) throw new Error("订单创建结果缺少内容");
  return normalizeOrder(result.data);
}

export async function confirmOrder(
  productId: string,
  quantity: number,
): Promise<VoucherOrderConfirmation> {
  const result = await orderApi.confirmVoucherOrder(String(productId), {
    quantity,
  });
  if (!result.data) throw new Error("订单确认响应格式异常，请稍后重试");
  return normalizeConfirmation(result.data);
}

function normalizeConfirmation(
  value: VoucherOrderConfirmationResponse,
): VoucherOrderConfirmation {
  const totalAmount = Number(value.totalAmount) || 0;
  const payAmount = Number(value.payAmount) || 0;
  return {
    ...value,
    productId: String(value.productId),
    shopId: String(value.shopId),
    unitAmount: Number(value.unitAmount) || 0,
    quantity: Number(value.quantity) || 1,
    minQuantity: Number(value.minQuantity) || 1,
    maxQuantity: Number(value.maxQuantity) || 1,
    totalAmount,
    payAmount,
    availableStock: Number(value.availableStock) || 0,
    unitAmountText: formatAmount(value.unitAmount),
    totalAmountText: formatAmount(totalAmount),
    payAmountText: formatAmount(payAmount),
  };
}

export async function loadMyOrders(
  query: {
    page?: number;
    size?: number;
    status?: VoucherOrderStatusFilter;
    productType?: VoucherProductType;
  } = {},
): Promise<PageResult<VoucherOrder>> {
  const result = await orderApi.listMyOrders(query);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("订单列表响应格式异常，请稍后重试");
  }
  return {
    items: result.data.items.map(normalizeOrder),
    page: toPositiveNumber(result.data.page, 1),
    size: toPositiveNumber(result.data.size, 10),
    total: toNonNegativeNumber(result.data.total),
  };
}

export async function loadMyOrder(
  orderId: string,
): Promise<VoucherOrderDetail> {
  const result = await orderApi.getMyOrder(String(orderId));
  if (!result.data?.order || !result.data.product || !result.data.shop) {
    throw new Error("订单详情响应格式异常，请稍后重试");
  }
  return {
    order: normalizeOrder(result.data.order),
    product: normalizeVoucherProduct(result.data.product),
    shop: adaptShopSummary(result.data.shop),
    serverTime: result.data.serverTime || new Date().toISOString(),
    paymentExpireTime:
      result.data.paymentExpireTime || result.data.order.paymentExpireTime,
    paymentStatus: result.data.paymentStatus,
    vouchers: (result.data.vouchers || []).map((voucher) => ({
      ...voucher,
      id: String(voucher.id),
      orderId: String(voucher.orderId),
      productId: String(voucher.productId),
      statusText:
        voucher.status === "UNUSED"
          ? "待使用"
          : voucher.status === "PARTIALLY_USED"
            ? "部分使用"
            : voucher.status === "USED"
              ? "已使用"
              : voucher.status === "EXPIRED"
                ? "已过期"
                : voucher.status === "REFUNDING"
                  ? "退款中"
                  : "已退款",
      usageRules: voucher.usageRules || "",
    })) as UserVoucher[],
  };
}

export async function payOrder(
  orderId: string,
  scenario?: "MOCK_SUCCESS" | "MOCK_FAILURE",
) {
  const key = `payment-${orderId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await orderApi.payMyOrder(
    orderId,
    scenario ? { scenario } : {},
    key,
  );
  if (!result.data) throw new Error("支付响应格式异常，请稍后重试");
  return result.data as VoucherPaymentResponse;
}

export async function prepareOrderPayment(
  orderId: string,
): Promise<VoucherPaymentResponse> {
  const result = await orderApi.prepareMyOrderPayment(orderId);
  if (!result.data) throw new Error("支付能力响应格式异常，请稍后重试");
  return result.data;
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
    productCover: value.productCover ? imageUrl(value.productCover) : undefined,
    productType: value.productType,
    productTypeLabel: value.productTypeLabel,
    statusText: orderStatusText(value.status),
  };
}

export function orderStatusText(status: VoucherOrder["status"]): string {
  return (
    {
      PENDING_PAYMENT: "待支付",
      PAID: "已支付",
      CANCELED: "已取消",
      REFUNDING: "退款中",
      REFUNDED: "已退款",
    }[status] || "订单处理中"
  );
}

function toPositiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toNonNegativeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
