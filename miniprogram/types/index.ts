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
export type SmsCodeScene = "LOGIN" | "REGISTRATION";
export type UserGender = "UNDISCLOSED" | "MALE" | "FEMALE";
export interface CurrentUserProfile extends UserDTO {
  phone: string;
  gender: UserGender;
  birthday: string | null;
  nicknameEditable: boolean;
  nicknameEditableAt: string | null;
}
export interface PublicUserProfile extends UserDTO {
  gender: UserGender;
  followee: number;
  fans: number;
  postCount: number;
}

export * from "./city";
export * from "./comment";
export * from "./draft";
export * from "./media";
export * from "./post";
export * from "./review";
export * from "./section";
export * from "./shop";
export * from "./voucher";
