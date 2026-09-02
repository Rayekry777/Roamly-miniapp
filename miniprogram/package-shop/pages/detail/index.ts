import { getShop, listVouchers } from '../../../services/shop'
import { seckillVoucher } from '../../../services/voucher'
import type { Shop, Voucher } from '../../../types'
import { splitImages } from '../../../utils/media'
import { requireLogin } from '../../../utils/navigation'

Page({
  data: { shop: null as Shop | null, images: [] as string[], vouchers: [] as Voucher[], loading: true, buyingId: '', orderMessage: '下单成功' },
  onLoad(options) { this.shopId = options.id || ''; void this.load() },
  async load() {
    try {
      const [shopResult, voucherResult] = await Promise.all([getShop(this.shopId), listVouchers(this.shopId)])
      const shop = shopResult.data
      this.setData({ shop, images: splitImages(shop?.images), vouchers: voucherResult.data || [] })
    } catch {
      this.setData({ shop: null, images: [], vouchers: [] })
    } finally { this.setData({ loading: false }) }
  },
  async buy(event: WechatMiniprogram.TouchEvent) {
    if (!requireLogin() || this.data.buyingId) return
    const id = String(event.currentTarget.dataset.id)
    this.setData({ buyingId: id })
    try {
      const result = await seckillVoucher(id)
      if (result.data) {
        this.setData({ orderMessage: `下单成功 · ${result.data.id}` })
        this.selectComponent('#order-motion')?.show(1600)
      }
    } finally { this.setData({ buyingId: '' }) }
  },
  shopId: ''
})
