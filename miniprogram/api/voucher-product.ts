import type {
  CursorPageResult,
  Result,
  VoucherProductResponse,
} from "../types";
import { request } from "../utils/request";

export function listVoucherProducts(
  shopId: string,
): Promise<Result<VoucherProductResponse[]>> {
  return request(`/v1/shops/${shopId}/voucher-products`, {
    auth: "public",
    showError: false,
  });
}

export function getVoucherProduct(
  productId: string,
): Promise<Result<VoucherProductResponse>> {
  return request(`/v1/voucher-products/${productId}`, {
    auth: "public",
    showError: false,
  });
}

export type VoucherProductPage = CursorPageResult<VoucherProductResponse>;
