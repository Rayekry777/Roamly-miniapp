import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('微信运行时模块兼容', () => {
  it('业务组件不直接导入 JSON 或类型目录中的运行时值', () => {
    const successMotion = readFileSync('miniprogram/components/success-motion/index.ts', 'utf8')
    const shopCard = readFileSync('miniprogram/components/shop-card/index.ts', 'utf8')
    const blogCard = readFileSync('miniprogram/components/blog-card/index.ts', 'utf8')
    expect(successMotion).not.toMatch(/from ['"].*\.json['"]/) 
    expect(shopCard).not.toMatch(/import \{.*\} from ['"].*types['"]/) 
    expect(blogCard).not.toMatch(/import \{.*\} from ['"].*types['"]/) 
  })
})
