import * as userApi from "../api/user";
import { authStore } from "../store/auth";
import type { CurrentUserProfile } from "../types";
import {
  deleteTemporaryImage,
  enqueueMediaCleanup,
  uploadTemporaryImage,
} from "./media";

export const getUser = userApi.getUser;
export const getPublicProfile = userApi.getPublicProfile;
export const getCurrentProfile = userApi.getCurrentProfile;
export const updateProfile = userApi.updateProfile;
export const updateNickname = userApi.updateNickname;
export const sendPhoneChangeCode = userApi.sendPhoneChangeCode;
export const changePhone = userApi.changePhone;
export const sendPasswordChangeCode = userApi.sendPasswordChangeCode;
export const changePassword = userApi.changePassword;
export const signIn = userApi.signIn;
export const signCount = userApi.signCount;

export async function replaceAvatar(
  filePath: string,
): Promise<CurrentUserProfile> {
  const media = await uploadTemporaryImage(filePath);
  try {
    const result = await userApi.updateAvatar(media.id);
    if (!result.data) throw new Error("头像保存结果为空");
    if (authStore.user) {
      authStore.user = { ...authStore.user, icon: result.data.icon };
    }
    return result.data;
  } catch (error) {
    try {
      await deleteTemporaryImage(media.id);
    } catch {
      enqueueMediaCleanup(media.id);
    }
    throw error;
  }
}
