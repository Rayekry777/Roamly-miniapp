import type {
  PageResult,
  Result,
  UserVoucherResponse,
  UserVoucherStatusFilter,
} from "../types";
import { request } from "../utils/request";

export function listMyVouchers(
  query: {
    page?: number;
    size?: number;
    status?: UserVoucherStatusFilter;
  } = {},
): Promise<Result<PageResult<UserVoucherResponse>>> {
  const data: Record<string, unknown> = {
    page: query.page || 1,
    size: query.size || 10,
  };
  if (query.status && query.status !== "ALL") data.status = query.status;
  return request("/v1/users/me/vouchers", {
    data,
    auth: "required",
    showError: false,
  });
}

export function getMyVoucher(
  voucherId: string,
): Promise<Result<UserVoucherResponse>> {
  return request(`/v1/users/me/vouchers/${voucherId}`, {
    auth: "required",
    showError: false,
  });
}
