import type { PageResult, Result, Shop, ShopType, Voucher } from "../types";
import { request } from "../utils/request";

export const listShopTypes = (): Promise<Result<ShopType[]>> =>
  request("/v1/shop-types", { auth: "public" });

export async function listShopsByType(data: {
  typeId: string;
  current?: number;
  x?: number;
  y?: number;
}): Promise<Result<Shop[]>> {
  const query: {
    typeId: string;
    page: number;
    size: number;
    longitude?: number;
    latitude?: number;
  } = {
    typeId: data.typeId,
    page: data.current || 1,
    size: 10,
  };

  if (
    data.x !== undefined &&
    data.y !== undefined &&
    Number.isFinite(data.x) &&
    Number.isFinite(data.y)
  ) {
    query.longitude = data.x;
    query.latitude = data.y;
  }

  const result = await request<PageResult<Shop>>("/v1/shops", {
    data: query,
    auth: "public",
  });
  return { ...result, data: result.data?.items || [] };
}

export async function searchShops(data: {
  name?: string;
  current?: number;
}): Promise<Result<Shop[]>> {
  const query: { page: number; size: number; name?: string } = {
    page: data.current || 1,
    size: 10,
  };
  if (data.name) query.name = data.name;

  const result = await request<PageResult<Shop>>("/v1/shops", {
    data: query,
    auth: "public",
  });
  return { ...result, data: result.data?.items || [] };
}

export async function listShopOptions(data: {
  cityCode: string;
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<Result<PageResult<Shop>>> {
  const query: {
    cityCode: string;
    page: number;
    size: number;
    keyword?: string;
  } = {
    cityCode: data.cityCode,
    page: data.page || 1,
    size: data.size || 10,
  };
  if (data.keyword?.trim()) query.keyword = data.keyword.trim();
  return request("/v1/shops", {
    data: query,
    auth: "public",
    showError: false,
  });
}

export const getShop = (id: string): Promise<Result<Shop>> =>
  request(`/v1/shops/${id}`, { auth: "public" });
export const listVouchers = (shopId: string): Promise<Result<Voucher[]>> =>
  request(`/v1/shops/${shopId}/vouchers`, { auth: "public" });
