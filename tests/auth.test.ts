import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loginByCode } from '../miniprogram/services/auth'
import { authStore } from '../miniprogram/store/auth'

const apiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  getMe: vi.fn()
}))

vi.mock('../miniprogram/api/user', () => apiMocks)

describe('login flow', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    apiMocks.login.mockReset()
    apiMocks.getMe.mockReset()
    vi.stubGlobal('wx', {
      getStorageSync: (key: string) => storage.get(key) || '',
      setStorageSync: (key: string, value: string) => storage.set(key, value),
      removeStorageSync: (key: string) => storage.delete(key)
    })
    authStore.clear()
  })

  it('在请求当前用户前持久化新 Token', async () => {
    const user = { id: '7', nickName: 'Roamly 用户', icon: '' }
    apiMocks.login.mockResolvedValue({ code: 'OK', message: '操作成功', data: { tokenType: 'Bearer', accessToken: 'new-token', expiresIn: 2592000 } })
    apiMocks.getMe.mockImplementation(async () => {
      expect(storage.get('roamly_satoken_v1')).toBe('new-token')
      return { code: 'OK', message: '操作成功', data: user }
    })

    await expect(loginByCode('13800138000', '123456')).resolves.toEqual(user)
    expect(apiMocks.login).toHaveBeenCalledWith('13800138000', '123456')
    expect(apiMocks.getMe).toHaveBeenCalledTimes(1)
    expect(authStore.token).toBe('new-token')
    expect(authStore.user).toEqual(user)
  })

  it('当前用户获取失败时清理新 Token', async () => {
    apiMocks.login.mockResolvedValue({ code: 'OK', message: '操作成功', data: { tokenType: 'Bearer', accessToken: 'new-token', expiresIn: 2592000 } })
    apiMocks.getMe.mockRejectedValue(new Error('当前用户获取失败'))

    await expect(loginByCode('13800138000', '123456')).rejects.toThrow('当前用户获取失败')
    expect(storage.get('roamly_satoken_v1')).toBeUndefined()
    expect(authStore.token).toBe('')
    expect(authStore.user).toBeNull()
  })
})
