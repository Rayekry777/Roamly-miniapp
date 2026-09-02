import type { Shop } from '../../types'
import { splitImages } from '../../utils/media'

Component({
  properties: { shop: { type: Object, value: {} } },
  data: { cover: '', score: '0.0', distance: '附近好店' },
  observers: { shop(value: Shop) { if (!value?.id) return; this.setData({ cover: splitImages(value.images)[0] || '', score: ((value.score || 0) / 10).toFixed(1), distance: value.distance ? `${(value.distance / 1000).toFixed(1)}km` : '附近好店' }) } },
  methods: { onSelect() { this.triggerEvent('select', { id: (this.data.shop as Shop).id }) } }
})
