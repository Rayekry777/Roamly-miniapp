import type {
  PageResult,
  RefundTimelineEvent,
  Result,
  VoucherRefundResponse,
} from "../types";
import { request } from "../utils/request";

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

export function getMyRefundTimeline(refundId: string) {
  return request<RefundTimelineEvent[]>(
    "/v1/users/me/refunds/" + refundId + "/timeline",
    { auth: "required", showError: false },
  );
}
