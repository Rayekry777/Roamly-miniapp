import { getEnvironment } from '../config/env'
import { authStore } from '../store/auth'
import type { ErrorResult, Result } from '../types'
import { navigateToLogin } from './navigation'
import { session } from './session'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

export async function chooseBlogImages(count: number): Promise<WechatMiniprogram.MediaFile[]> {
  const response = await wx.chooseMedia({ count: Math.min(9, count), mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'] })
  return response.tempFiles.filter((file) => {
    const extension = file.tempFilePath.split('.').pop()?.toLowerCase() || ''
    return file.size <= MAX_FILE_SIZE && ALLOWED_EXTENSIONS.includes(extension)
  })
}

export function uploadBlogImage(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getEnvironment().apiBaseUrl}/v1/blog-images`, filePath, name: 'file', timeout: 30000,
      header: { Authorization: `Bearer ${session.getToken()}` },
      success(response) {
        if (response.statusCode === 401) { authStore.clear(); navigateToLogin(); reject(new Error('登录已过期')); return }
        try {
          const result = JSON.parse(response.data) as Result<{ path: string }> | ErrorResult
          if (response.statusCode < 200 || response.statusCode >= 300 || !('data' in result) || !result.data) throw new Error(result.message || '上传失败')
          resolve(result.data.path)
        } catch (error) { reject(error) }
      },
      fail(error) { reject(new Error(error.errMsg.includes('timeout') ? '上传超时' : '上传失败')) }
    })
  })
}
