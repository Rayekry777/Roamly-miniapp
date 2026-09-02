import type { Blog } from '../../types'
import { splitImages } from '../../utils/media'
Component({ properties: { blog: { type: Object, value: {} } }, data: { cover: '' }, observers: { blog(value: Blog) { this.setData({ cover: splitImages(value?.images)[0] || '' }) } }, methods: { onSelect() { this.triggerEvent('select', { id: (this.data.blog as Blog).id }) } } })
