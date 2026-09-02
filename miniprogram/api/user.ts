import type { AuthToken, Result, UserDTO, UserInfo } from '../types'
import { request } from '../utils/request'
export const sendCode = (phone: string): Promise<Result<null>> => request('/v1/auth/sms-codes', { method: 'POST', data: { phone }, auth: 'public' })
export const login = (phone: string, code: string): Promise<Result<AuthToken>> => request('/v1/auth/sessions', { method: 'POST', data: { phone, code }, auth: 'public' })
export const logout = (): Promise<Result<null>> => request('/v1/auth/session', { method: 'DELETE' })
export const getMe = (): Promise<Result<UserDTO>> => request('/v1/users/me')
export const getUser = (id: string): Promise<Result<UserDTO>> => request(`/v1/users/${id}`, { auth: 'public' })
export const getUserInfo = (id: string): Promise<Result<UserInfo>> => request(`/v1/users/${id}/profile`, { auth: 'public' })
export const signIn = (): Promise<Result<null>> => request('/v1/users/me/check-ins/today', { method: 'PUT', dedupe: false })
export async function signCount(): Promise<Result<number>> { const r = await request<{ days: number }>('/v1/users/me/check-ins/streak'); return { ...r, data: r.data?.days ?? 0 } }
