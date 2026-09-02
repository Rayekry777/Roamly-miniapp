import type { Blog, CursorPageResult, IdResponse, PageResult, Result, ScrollResult, UserDTO } from '../types'
import { request } from '../utils/request'
export async function listHotBlogs(page = 1): Promise<Result<Blog[]>> { const r = await request<PageResult<Blog>>('/v1/blogs', { data: { page, size: 10 }, auth: 'optional' }); return { ...r, data: r.data?.items || [] } }
export async function listMyBlogs(page = 1): Promise<Result<Blog[]>> { const r = await request<PageResult<Blog>>('/v1/users/me/blogs', { data: { page, size: 10 } }); return { ...r, data: r.data?.items || [] } }
export async function listUserBlogs(id: string, page = 1): Promise<Result<Blog[]>> { const r = await request<PageResult<Blog>>(`/v1/users/${id}/blogs`, { data: { page, size: 10 }, auth: 'public' }); return { ...r, data: r.data?.items || [] } }
export async function listFollowBlogs(cursor: number, offset = 0): Promise<Result<ScrollResult<Blog>>> { const r = await request<CursorPageResult<Blog>>('/v1/feeds/following', { data: { cursor, offset } }); const p = r.data; return { ...r, data: p ? { list: p.items, minTime: p.nextCursor, offset: p.nextOffset, hasMore: p.hasMore } : null } }
export const getBlog = (id: string): Promise<Result<Blog>> => request(`/v1/blogs/${id}`, { auth: 'optional' })
export const listBlogLikes = (id: string): Promise<Result<UserDTO[]>> => request(`/v1/blogs/${id}/likes`, { auth: 'public' })
export const likeBlog = (id: string, liked: boolean): Promise<Result<null>> => request(`/v1/blogs/${id}/like`, { method: liked ? 'DELETE' : 'PUT', dedupe: false })
export const createBlog = (data: Pick<Blog, 'title' | 'content'> & Partial<Pick<Blog, 'shopId' | 'images'>>): Promise<Result<IdResponse>> => request('/v1/blogs', { method: 'POST', data: { ...data, shopId: data.shopId || '0', images: data.images || '' }, dedupe: false })
