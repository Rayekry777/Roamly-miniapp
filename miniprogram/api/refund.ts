import type { Result, VoucherRefundResponse } from "../types";
import { request } from "../utils/request";

export function requestVoucherRefund(
  voucherId: string,
  reason: string,
  idempotencyKey: string,
): Promise<Result<VoucherRefundResponse>> {
  return request(`/v1/users/me/vouchers/${voucherId}/refunds`, {
    method: "POST",
    data: { reason },
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
