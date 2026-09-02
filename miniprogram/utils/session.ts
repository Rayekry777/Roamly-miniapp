const TOKEN_KEY = 'roamly_satoken_v1'

export const session = {
  getToken(): string { return wx.getStorageSync(TOKEN_KEY) || '' },
  setToken(token: string): void { wx.setStorageSync(TOKEN_KEY, token) },
  clear(): void { wx.removeStorageSync(TOKEN_KEY) }
}
