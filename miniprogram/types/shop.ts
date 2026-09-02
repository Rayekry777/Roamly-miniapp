export type ShopSort = "DISTANCE" | "SCORE" | "POPULAR";

export interface ShopType {
  id: string;
  name: string;
  icon?: string;
  sort?: number;
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
}

export interface ShopListQuery {
  cityCode: string;
  typeId?: string;
  keyword?: string;
  sort: ShopSort;
  page?: number;
  size?: number;
  longitude?: number;
  latitude?: number;
}
