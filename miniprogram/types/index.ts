export interface Result<T> {
  code: string;
  message: string;
  data: T | null;
}
export interface ErrorResult {
  code: string;
  message: string;
  fieldErrors?: Array<{ field: string; message: string }>;
}
export interface PageResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}
export interface CursorPageResult<T> {
  items: T[];
  nextCursor: number | null;
  nextOffset: number;
  hasMore: boolean;
}
export interface ScrollResult<T> {
  list: T[];
  minTime: number;
  offset: number;
  hasMore: boolean;
}
export interface AuthToken {
  tokenType: "Bearer";
  accessToken: string;
  expiresIn: number;
}
export interface IdResponse {
  id: string;
}
export interface UserDTO {
  id: string;
  nickName: string;
  icon: string;
}
export interface UserInfo {
  userId: string;
  city?: string;
  introduce?: string;
  fans?: number;
  followee?: number;
  gender?: number;
  birthday?: string;
  credits?: number;
  level?: number;
}
export interface ShopType {
  id: string;
  name: string;
  icon?: string;
  sort?: number;
}
export interface Shop {
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
export interface Blog {
  id: string;
  shopId?: string;
  userId: string;
  icon?: string;
  name?: string;
  likedByMe?: boolean;
  isLike?: boolean;
  title: string;
  images: string;
  content: string;
  liked?: number;
  comments?: number;
  createTime?: string;
}
export interface Voucher {
  id: string;
  shopId: string;
  title: string;
  subTitle?: string;
  rules?: string;
  payValue: number;
  actualValue: number;
  type?: number;
  status?: number;
  stock?: number;
  beginTime?: string;
  endTime?: string;
}
export interface UploadedImage {
  localPath: string;
  remotePath: string;
  status: "uploading" | "done" | "failed";
  error?: string;
}

export * from "./city";
export * from "./media";
export * from "./post";
export * from "./section";
