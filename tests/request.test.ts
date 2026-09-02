import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authStore } from '../miniprogram/store/auth'
import { request } from '../miniprogram/utils/request'

describe('request', () => {
  beforeEach(() => {
    vi.stubGlobal('getCurrentPages', () => [])
    vi.stubGlobal('wx', {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
      getStorageSync: () => 'token',
      request: vi.fn((options) => options.success({ statusCode: 200, data: { code: 'OK', message: '操作成功', data: { id: '1' } } })),
      showToast: vi.fn(), navigateTo: vi.fn()
    })
  })

  it('解析统一 Result 并携带 authorization', async () => {
    const result = await request<{ id: string }>('/v1/users/me')
    expect(result.data?.id).toBe('1')
    expect(vi.mocked(wx.request).mock.calls[0]?.[0].url).toBe('http://127.0.0.1:8081/v1/users/me')
    expect(vi.mocked(wx.request).mock.calls[0]?.[0].header).toEqual({ Authorization: 'Bearer token' })
  })

  it('生产基础地址只拼接一次 api 网关前缀', async () => {
    vi.stubGlobal('wx', {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
      getStorageSync: () => 'token',
      request: vi.fn((options) => options.success({ statusCode: 200, data: { code: 'OK', message: '操作成功', data: null } })),
      showToast: vi.fn(), navigateTo: vi.fn()
    })

    await request('/v1/users/me')

    expect(vi.mocked(wx.request).mock.calls[0]?.[0].url).toBe('https://api.example.com/api/v1/users/me')
  })

  it('401 清理完整会话并且只跳转一次登录页', async () => {
    authStore.token = 'token'
    const removeStorageSync = vi.fn()
    const navigateTo = vi.fn((options) => options.complete?.())
    vi.stubGlobal('wx', {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
      getStorageSync: () => 'token', removeStorageSync,
      request: vi.fn((options) => options.success({ statusCode: 401, data: null })),
      showToast: vi.fn(), navigateTo
    })
    await expect(request('/v1/users/me')).rejects.toMatchObject({ statusCode: 401 })
    expect(authStore.token).toBe('')
    expect(removeStorageSync).toHaveBeenCalledWith('roamly_satoken_v1')
    expect(navigateTo).toHaveBeenCalledTimes(1)
  })
})
