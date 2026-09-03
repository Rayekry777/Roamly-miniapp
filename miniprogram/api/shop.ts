import type {
  CursorPageResult,
  PageResult,
  PostCardResponse,
  Result,
  ShopListQuery,
  ShopResponse,
  ShopType,
} from "../types";
import { request } from "../utils/request";

export const listShopTypes = (): Promise<Result<ShopType[]>> =>
  request("/v1/shop-types", { auth: "public" });

export function listShops(
  query: ShopListQuery,
): Promise<Result<PageResult<ShopResponse>>> {
  const keyword = query.keyword?.trim();
  const data: Record<string, unknown> = {
    cityCode: query.cityCode,
    sort: query.sort,
    page: query.page || 1,
    size: query.size || 10,
  };
  if (query.typeId) data.typeId = query.typeId;
  if (keyword) {
    data.keyword = keyword;
    // 当前后端仍使用 name；目标商户契约落地后删除这个兼容参数。
    data.name = keyword;
  }
  if (hasCoordinates(query.longitude, query.latitude)) {
    data.longitude = query.longitude;
    data.latitude = query.latitude;
  }

  return request("/v1/shops", {
    data,
    auth: "public",
    showError: false,
  });
}

export function getShop(
  id: string,
  location: { longitude?: number; latitude?: number } = {},
): Promise<Result<ShopResponse>> {
  const data = hasCoordinates(location.longitude, location.latitude)
    ? { longitude: location.longitude, latitude: location.latitude }
    : undefined;
  return request(`/v1/shops/${id}`, {
    ...(data ? { data } : {}),
    auth: "public",
    showError: false,
  });
}

export function listShopPosts(
  shopId: string,
  query: { cursor?: number; offset?: number; size?: number } = {},
): Promise<Result<CursorPageResult<PostCardResponse>>> {
  const data: Record<string, unknown> = { size: query.size || 3 };
  if (query.cursor !== undefined) data.cursor = query.cursor;
  if (query.offset !== undefined) data.offset = query.offset;
  return request(`/v1/shops/${shopId}/posts`, {
    data,
    auth: "optional",
    showError: false,
  });
}

function hasCoordinates(
  longitude?: number,
  latitude?: number,
): longitude is number {
  return (
    longitude !== undefined &&
    latitude !== undefined &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}
