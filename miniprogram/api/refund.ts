import type { PageResult, Result, VoucherRefundResponse } from "../types";
import { request } from "../utils/request";

export function requestVoucherRefund(
  voucherId: string,
  data: { reasonCode: string; description?: string; quantity?: number },
  idempotencyKey: string,
): Promise<Result<VoucherRefundResponse>> {
  return request(`/v1/users/me/vouchers/${voucherId}/refunds`, {
    method: "POST",
    // 当前业务按单券退款，忽略调用方可能传入的数量，避免误退多张券。
    data: { ...data, quantity: 1 },
    auth: "required",
    dedupe: false,
    showError: false,
    headers: { "Idempotency-Key": idempotencyKey },
  });
}
export function requestOrderRefund(
  data: {
    orderId: string;
    voucherIds: string[];
    reasonCode: string;
    description?: string;
  },
  idempotencyKey: string,
) {
  return request<VoucherRefundResponse>("/v1/users/me/refunds", {
    method: "POST",
    data,
    auth: "required",
    dedupe: false,
    showError: false,
    headers: { "Idempotency-Key": idempotencyKey },
  });
}
export function issueVoucherQrToken(
  voucherId: string,
): Promise<Result<{ token: string; expiresAt: string }>> {
  return request(`/v1/users/me/vouchers/${voucherId}/qr-tokens`, {
    method: "POST",
    auth: "required",
    dedupe: false,
    showError: false,
  });
}

export function listMyRefunds(
  query: { page?: number; size?: number; status?: string } = {},
) {
  return request<PageResult<VoucherRefundResponse>>("/v1/users/me/refunds", {
    data: {
      page: query.page || 1,
      size: query.size || 20,
      ...(query.status ? { status: query.status } : {}),
    },
    auth: "required",
    showError: false,
  });
}

export function getMyRefund(refundId: string) {
  return request<VoucherRefundResponse>(`/v1/users/me/refunds/${refundId}`, {
    auth: "required",
    showError: false,
  });
}
