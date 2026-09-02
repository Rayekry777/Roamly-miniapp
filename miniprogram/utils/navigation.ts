import { session } from './session'

const LOGIN_ROUTE = 'package-user/pages/login/index'
const TAB_ROUTES = ['/pages/home/index', '/pages/discover/index', '/pages/following/index', '/pages/me/index']
const PROTECTED_TAB_ROUTES = ['/pages/following/index', '/pages/me/index']

let loginNavigationPending = false

export function currentRoute(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  if (!page) return '/pages/home/index'
  const query = Object.entries(page.options || {}).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&')
  return `/${page.route}${query ? `?${query}` : ''}`
}

function hasLoginPage(): boolean {
  return getCurrentPages().some((page) => page.route === LOGIN_ROUTE)
}

export function navigateToLogin(redirect = currentRoute()): boolean {
  if (loginNavigationPending || hasLoginPage()) return false
  loginNavigationPending = true
  wx.navigateTo({
    url: `/${LOGIN_ROUTE}?redirect=${encodeURIComponent(redirect)}`,
    complete: () => { loginNavigationPending = false }
  })
  return true
}

export function requireLogin(redirect = currentRoute()): boolean {
  if (session.getToken()) return true
  navigateToLogin(redirect)
  return false
}

export function navigateToTab(url: string, requiresLogin = PROTECTED_TAB_ROUTES.includes(url)): void {
  if (!TAB_ROUTES.includes(url)) return
  if (!requiresLogin || session.getToken()) { wx.switchTab({ url }); return }
  const route = currentRoute().split('?')[0]
  if (route === url) { navigateToLogin(url); return }
  wx.switchTab({ url, success: () => { navigateToLogin(url) } })
}

export function navigateAfterLogin(redirect: string): void {
  const path = redirect.split('?')[0] || '/pages/home/index'
  if (TAB_ROUTES.includes(path)) wx.switchTab({ url: path })
  else wx.redirectTo({ url: redirect, fail: () => wx.switchTab({ url: '/pages/home/index' }) })
}

export function syncTabBar(page: WechatMiniprogram.Page.Instance<any, any>): void {
  const tabBar = page.getTabBar?.()
  if (tabBar) tabBar.setData({ value: `/${page.route}` })
}
