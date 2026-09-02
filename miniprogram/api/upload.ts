import type { Result } from '../types'
import { request } from '../utils/request'
export const deleteBlogImage = (path: string): Promise<Result<null>> => request(`/v1/blog-images?path=${encodeURIComponent(path)}`, { method: 'DELETE', dedupe: false })
