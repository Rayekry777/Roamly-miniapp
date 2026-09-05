import type {
  CursorPageResult,
  PageResult,
  Result,
  VoucherProductDetailResponse,
  VoucherProductResponse,
  VoucherProductListItemResponse,
  VoucherProductListQuery,
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

export function listPublicVoucherProducts(
  query: VoucherProductListQuery,
): Promise<Result<PageResult<VoucherProductListItemResponse>>> {
  const data: Record<string, unknown> = {
    cityCode: query.cityCode,
    sort: query.sort,
    page: query.page || 1,
    size: query.size || 10,
  };
  if (query.typeId) data.typeId = query.typeId;
  if (query.keyword?.trim()) data.keyword = query.keyword.trim();
  if (query.longitude !== undefined && query.latitude !== undefined) {
    data.longitude = query.longitude;
    data.latitude = query.latitude;
  }
  return request("/v1/voucher-products", {
    data,
    auth: "public",
    showError: false,
  });
}

export function getVoucherProduct(
  productId: string,
): Promise<Result<VoucherProductDetailResponse>> {
  return request(`/v1/voucher-products/${productId}`, {
    auth: "public",
    showError: false,
  });
}

export type VoucherProductPage = CursorPageResult<VoucherProductResponse>;
