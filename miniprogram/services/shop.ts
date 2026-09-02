import * as shopApi from "../api/shop";
import type {
  CursorPageResult,
  PageResult,
  PostCard,
  Shop,
  ShopListQuery,
  ShopResponse,
  ShopSummary,
} from "../types";
import { splitImages } from "../utils/media";
import { adaptPostCard } from "./post-card";

export const listShopTypes = shopApi.listShopTypes;
export const listVouchers = shopApi.listVouchers;

export async function loadShopPage(
  query: ShopListQuery,
): Promise<PageResult<Shop>> {
  if (!query.cityCode) throw new Error("当前暂无可用城市");
  const normalizedQuery = normalizeShopQuery(query);
  const result = await shopApi.listShops(normalizedQuery);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("商户列表返回格式异常，请稍后重试");
  }
  return {
    ...result.data,
    items: result.data.items.map(adaptShop),
  };
}

export async function loadShopDetail(
  shopId: string,
  location: { longitude?: number; latitude?: number } = {},
): Promise<Shop> {
  const result = await shopApi.getShop(shopId, location);
  if (!result.data) throw new Error("商户不存在或已下架");
  return adaptShop(result.data);
}

export async function loadShopPostPage(
  shopId: string,
): Promise<CursorPageResult<PostCard>> {
  const result = await shopApi.listShopPosts(shopId, { size: 3 });
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("商户相关动态接口尚未完成升级，请稍后重试");
  }
  return {
    ...result.data,
    items: result.data.items.map(adaptPostCard),
  };
}

export async function listPublishShopOptions(query: {
  cityCode: string;
  keyword?: string;
}): Promise<ShopSummary[]> {
  const result = await loadShopPage({
    ...query,
    sort: "POPULAR",
    page: 1,
    size: 10,
  });
  return result.items.map((shop) => ({
    id: shop.id,
    name: shop.name,
    cover: shop.cover,
    address: shop.address,
    distance: shop.distance,
    score: shop.score,
  }));
}

export function adaptShop(response: ShopResponse): Shop {
  const images = splitImages(response.images);
  const distance = Number.isFinite(response.distance)
    ? response.distance
    : undefined;
  return {
    ...response,
    id: String(response.id),
    typeId: String(response.typeId),
    images,
    cover: images[0],
    sold: response.sold || 0,
    comments: response.comments || 0,
    score: (response.score || 0) / 10,
    distance,
    distanceText: formatDistance(distance),
  };
}

export function normalizeShopQuery(query: ShopListQuery): ShopListQuery {
  const hasLocation =
    isValidCoordinate(query.longitude, -180, 180) &&
    isValidCoordinate(query.latitude, -90, 90);
  return {
    ...query,
    sort: query.sort === "DISTANCE" && !hasLocation ? "SCORE" : query.sort,
    longitude: hasLocation ? query.longitude : undefined,
    latitude: hasLocation ? query.latitude : undefined,
  };
}

function formatDistance(distance?: number): string {
  if (distance === undefined) return "距离待定位";
  if (distance < 1000) return `${Math.round(distance)}m`;
  return `${(distance / 1000).toFixed(1)}km`;
}

function isValidCoordinate(
  value: number | undefined,
  minimum: number,
  maximum: number,
): value is number {
  return (
    value !== undefined &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}
