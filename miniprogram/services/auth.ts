import * as userApi from '../api/user'
import { authStore } from '../store/auth'
import type { UserDTO } from '../types'

export async function loginByCode(phone: string, code: string): Promise<UserDTO> {
  const tokenResult = await userApi.login(phone, code)
  if (!tokenResult.data) throw new Error('登录令牌为空')
  // 当前用户接口必须携带新 Token，因此先持久化会话，再发起认证请求。
  authStore.setToken(tokenResult.data.accessToken)
  try {
    const userResult = await userApi.getMe()
    if (!userResult.data) throw new Error('用户信息为空')
    authStore.user = userResult.data
    return userResult.data
  } catch (error) {
    authStore.clear()
    throw error
  }
}

export async function requestLoginCode(phone: string): Promise<void> {
  await userApi.sendCode(phone)
}

export async function signOut(): Promise<void> {
  try { await userApi.logout() } finally { authStore.clear() }
}

export async function refreshCurrentUser(): Promise<UserDTO | null> {
  if (!authStore.isLoggedIn()) return null
  const result = await userApi.getMe()
  authStore.user = result.data
  return result.data
}
