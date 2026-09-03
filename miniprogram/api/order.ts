import type {
  PageResult,
  Result,
  VoucherOrderCreateRequest,
  VoucherOrderResponse,
  VoucherOrderStatusFilter,
} from "../types";
import { request } from "../utils/request";

export function createVoucherOrder(
  productId: string,
  data: VoucherOrderCreateRequest,
): Promise<Result<VoucherOrderResponse>> {
  return request(`/v1/voucher-products/${productId}/orders`, {
    method: "POST",
    data,
    dedupe: false,
    showError: false,
  });
}

export function listMyOrders(
  query: {
    page?: number;
    size?: number;
    status?: VoucherOrderStatusFilter;
  } = {},
): Promise<Result<PageResult<VoucherOrderResponse>>> {
  const data: Record<string, unknown> = {
    page: query.page || 1,
    size: query.size || 10,
  };
  if (query.status && query.status !== "ALL") data.status = query.status;
  return request("/v1/users/me/orders", {
    data,
    auth: "required",
    showError: false,
  });
}

export function getMyOrder(
  orderId: string,
): Promise<Result<VoucherOrderResponse>> {
  return request(`/v1/users/me/orders/${orderId}`, {
    auth: "required",
    showError: false,
  });
}

export function cancelMyOrder(orderId: string): Promise<Result<null>> {
  return request(`/v1/users/me/orders/${orderId}`, {
    method: "DELETE",
    auth: "required",
    dedupe: false,
    showError: false,
  });
}
