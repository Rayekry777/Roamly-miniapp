import type { Result, UserDTO } from '../types'
import { request } from '../utils/request'
export async function checkFollow(id: string): Promise<Result<boolean>> { const r = await request<{ following: boolean }>(`/v1/users/me/following/${id}`); return { ...r, data: r.data?.following ?? false } }
export const followUser = (id: string, follow: boolean): Promise<Result<null>> => request(`/v1/users/me/following/${id}`, { method: follow ? 'PUT' : 'DELETE', dedupe: false })
export const commonFollows = (id: string): Promise<Result<UserDTO[]>> => request(`/v1/users/${id}/common-following`)
