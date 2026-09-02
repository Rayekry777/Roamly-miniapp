import * as shopApi from "../api/shop";
import type { ShopSummary } from "../types";
import { splitImages } from "../utils/media";

export const listShopTypes = shopApi.listShopTypes;
export const listShopsByType = shopApi.listShopsByType;
export const searchShops = shopApi.searchShops;
export const getShop = shopApi.getShop;
export const listVouchers = shopApi.listVouchers;

export async function listPublishShopOptions(query: {
  cityCode: string;
  keyword?: string;
}): Promise<ShopSummary[]> {
  const result = await shopApi.listShopOptions(query);
  return (result.data?.items || []).map((shop) => ({
    id: shop.id,
    name: shop.name,
    cover: splitImages(shop.images)[0],
    address: shop.address,
    distance: shop.distance,
    score: shop.score,
  }));
}
