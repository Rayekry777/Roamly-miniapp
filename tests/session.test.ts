import { beforeEach, describe, expect, it, vi } from 'vitest'
import { session } from '../miniprogram/utils/session'

describe('session', () => {
  const storage = new Map<string, string>()
  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('wx', { getStorageSync: (key: string) => storage.get(key) || '', setStorageSync: (key: string, value: string) => storage.set(key, value), removeStorageSync: (key: string) => storage.delete(key) })
  })

  it('保存并清理授权令牌', () => { session.setToken('token'); expect(session.getToken()).toBe('token'); session.clear(); expect(session.getToken()).toBe('') })
})
