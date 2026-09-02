import { beforeEach, describe, expect, it, vi } from 'vitest'
import { navigateAfterLogin, navigateToLogin, navigateToTab } from '../miniprogram/utils/navigation'

describe('navigateAfterLogin', () => {
  beforeEach(() => vi.stubGlobal('wx', { switchTab: vi.fn(), redirectTo: vi.fn() }))

  it('Tab 页面使用 switchTab 回跳', () => {
    navigateAfterLogin('/pages/me/index')
    expect(wx.switchTab).toHaveBeenCalledWith({ url: '/pages/me/index' })
  })

  it('分包页面保留参数并使用 redirectTo 回跳', () => {
    navigateAfterLogin('/package-shop/pages/detail/index?id=8')
    expect(wx.redirectTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/package-shop/pages/detail/index?id=8' }))
  })

  it('并发鉴权只打开一个登录页', () => {
    vi.stubGlobal('getCurrentPages', () => [])
    const navigateTo = vi.fn()
    vi.stubGlobal('wx', { navigateTo })
    navigateToLogin('/pages/me/index')
    navigateToLogin('/pages/me/index')
    expect(navigateTo).toHaveBeenCalledTimes(1)
    navigateTo.mock.calls[0]?.[0].complete()
  })

  it('未登录点击受限 Tab 时先进入 Tab 再打开登录页', () => {
    vi.stubGlobal('getCurrentPages', () => [{ route: 'pages/home/index', options: {} }])
    const navigateTo = vi.fn((options) => options.complete?.())
    const switchTab = vi.fn((options) => options.success?.())
    vi.stubGlobal('wx', { getStorageSync: () => '', navigateTo, switchTab })
    navigateToTab('/pages/me/index')
    expect(switchTab).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/me/index' }))
    expect(navigateTo).toHaveBeenCalledTimes(1)
  })
})
