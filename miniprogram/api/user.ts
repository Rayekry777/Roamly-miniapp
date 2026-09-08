import type {
  AuthToken,
  CurrentUserProfile,
  PublicUserProfile,
  Result,
  SmsCodeScene,
  UserDTO,
  UserGender,
} from "../types";
import { request } from "../utils/request";
export const sendCode = (
  phone: string,
  scene: SmsCodeScene,
): Promise<Result<null>> =>
  request("/v1/auth/sms-codes", {
    method: "POST",
    data: { phone, scene },
    auth: "public",
  });
export const login = (
  phone: string,
  code: string,
): Promise<Result<AuthToken>> =>
  request("/v1/auth/sessions", {
    method: "POST",
    data: { phone, code },
    auth: "public",
  });
export const register = (
  phone: string,
  code: string,
  password: string,
  confirmPassword: string,
): Promise<Result<AuthToken>> =>
  request("/v1/auth/registrations", {
    method: "POST",
    data: { phone, code, password, confirmPassword },
    auth: "public",
    dedupe: false,
  });
export const passwordLogin = (
  phone: string,
  password: string,
): Promise<Result<AuthToken>> =>
  request("/v1/auth/password-sessions", {
    method: "POST",
    data: { phone, password },
    auth: "public",
    dedupe: false,
  });
export const logout = (): Promise<Result<null>> =>
  request("/v1/auth/session", { method: "DELETE" });
export const getMe = (): Promise<Result<UserDTO>> => request("/v1/users/me");
export const getUser = (id: string): Promise<Result<UserDTO>> =>
  request(`/v1/users/${id}`, { auth: "public" });
export const getPublicProfile = (
  id: string,
): Promise<Result<PublicUserProfile>> =>
  request(`/v1/users/${id}/profile`, { auth: "public" });
export const getCurrentProfile = (): Promise<Result<CurrentUserProfile>> =>
  request("/v1/users/me/profile");
export const updateProfile = (
  gender: UserGender,
  birthday: string | null,
): Promise<Result<CurrentUserProfile>> =>
  request("/v1/users/me/profile", {
    method: "PUT",
    data: { gender, birthday },
    dedupe: false,
  });
export const updateNickname = (
  nickName: string,
): Promise<Result<CurrentUserProfile>> =>
  request("/v1/users/me/nickname", {
    method: "PUT",
    data: { nickName },
    dedupe: false,
  });
export const updateAvatar = (
  mediaId: string,
): Promise<Result<CurrentUserProfile>> =>
  request("/v1/users/me/avatar", {
    method: "PUT",
    data: { mediaId },
    dedupe: false,
  });
export const updateCityPreference = (cityCode: string): Promise<Result<null>> =>
  request("/v1/users/me/city-preference", {
    method: "PUT",
    data: { cityCode },
    dedupe: false,
    showError: false,
  });
export const sendPhoneChangeCode = (newPhone: string): Promise<Result<null>> =>
  request("/v1/users/me/phone-change/sms-codes", {
    method: "POST",
    data: { newPhone },
    dedupe: false,
  });
export const changePhone = (
  currentPassword: string,
  newPhone: string,
  code: string,
): Promise<Result<null>> =>
  request("/v1/users/me/phone", {
    method: "PUT",
    data: { currentPassword, newPhone, code },
    dedupe: false,
  });
export const sendPasswordChangeCode = (): Promise<Result<null>> =>
  request("/v1/users/me/password-change/sms-codes", {
    method: "POST",
    dedupe: false,
  });
export const changePassword = (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  code: string,
): Promise<Result<null>> =>
  request("/v1/users/me/password", {
    method: "PUT",
    data: { currentPassword, newPassword, confirmPassword, code },
    dedupe: false,
  });
export const signIn = (): Promise<Result<null>> =>
  request("/v1/users/me/check-ins/today", { method: "PUT", dedupe: false });
export async function signCount(): Promise<Result<number>> {
  const r = await request<{ days: number }>("/v1/users/me/check-ins/streak");
  return { ...r, data: r.data?.days ?? 0 };
}
