export type ShopSort =
  | "DISTANCE"
  | "SCORE"
  | "POPULAR"
  | "RECOMMENDED"
  | "SALES";

export interface ShopType {
  id: string;
  name: string;
  icon?: string;
  sort?: number;
  parentId?: string;
  children?: ShopType[];
}

export interface ShopResponse {
  id: string;
  name: string;
  typeId: string;
  images: string;
  area?: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  avgPrice?: number;
  sold?: number;
  comments?: number;
  score?: number;
  openHours?: string;
  distance?: number;
}

export interface Shop {
  id: string;
  name: string;
  typeId: string;
  images: string[];
  cover?: string;
  area?: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  avgPrice?: number;
  sold: number;
  comments: number;
  score: number;
  openHours?: string;
  distance?: number;
  distanceText: string;
  typeName?: string;
  categoryId?: string;
  soldCount?: number;
  availableVoucherCount?: number;
  vouchers?: ShopVoucherSummary[];
}

export interface ShopListQuery {
  cityCode: string;
  productId?: string;
  categoryId?: string;
  typeId?: string;
  keyword?: string;
  sort: ShopSort;
  page?: number;
  size?: number;
  longitude?: number;
  latitude?: number;
}

export interface ShopVoucherSummary {
  id: string;
  title: string;
  productType: string;
  payAmount: number;
  originalAmount?: number;
  totalUseCount?: number;
  soldCount: number;
  priceText?: string;
  originalText?: string;
  typeLabel?: string;
}
export interface ShopDiscoveryResponse {
  shop: ShopResponse;
  categoryId: string;
  categoryName: string;
  typeName: string;
  soldCount: number;
  availableVoucherCount: number;
  vouchers: ShopVoucherSummary[];
}
