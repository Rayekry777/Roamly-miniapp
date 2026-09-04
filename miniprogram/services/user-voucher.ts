import * as voucherApi from "../api/user-voucher";
import type {
  PageResult,
  UserVoucher,
  UserVoucherResponse,
  UserVoucherStatusFilter,
} from "../types";

export async function loadMyVouchers(
  query: {
    page?: number;
    size?: number;
    status?: UserVoucherStatusFilter;
  } = {},
): Promise<PageResult<UserVoucher>> {
  const result = await voucherApi.listMyVouchers(query);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("券包响应格式异常，请稍后重试");
  }
  return { ...result.data, items: result.data.items.map(normalizeUserVoucher) };
}

export async function loadMyVoucher(voucherId: string): Promise<UserVoucher> {
  const result = await voucherApi.getMyVoucher(String(voucherId));
  if (!result.data) throw new Error("用户券不存在或无权查看");
  return normalizeUserVoucher(result.data);
}

export function normalizeUserVoucher(value: UserVoucherResponse): UserVoucher {
  return {
    ...value,
    id: String(value.id),
    voucherCode: String(value.voucherCode),
    orderId: String(value.orderId),
    productId: String(value.productId),
    shop: {
      ...value.shop,
      id: String(value.shop.id),
    },
    statusText: voucherStatusText(value.status),
    usageRules: value.usageRules || "请按商户规则使用",
  };
}

export function voucherStatusText(status: UserVoucher["status"]): string {
  return {
    UNUSED: "未使用",
    USED: "已使用",
    EXPIRED: "已过期",
    REFUNDED: "已退款",
  }[status];
}
