import { createBlog } from '../../../services/blog'
import { deleteBlogImage, uploadBlogImage } from '../../../services/upload'
import type { UploadedImage } from '../../../types'

interface UploadView { url: string; name: string; type: 'image'; status: 'loading' | 'done' | 'failed'; percent: number }

Page({
  data: { title: '', content: '', shopId: '', images: [] as UploadedImage[], files: [] as UploadView[], submitting: false },
  onLoad() { wx.enableAlertBeforeUnload?.({ message: '图片已经上传，离开前请确认是否放弃本次发布。' }) },
  onUnload() { if (!this.published) this.data.images.filter((image) => image.remotePath).forEach((image) => { void deleteBlogImage(image.remotePath).catch(() => undefined) }) },
  onTitle(event: WechatMiniprogram.CustomEvent) { this.setData({ title: this.eventText(event) }) },
  onContent(event: WechatMiniprogram.CustomEvent) { this.setData({ content: this.eventText(event) }) },
  onShopId(event: WechatMiniprogram.CustomEvent) { this.setData({ shopId: this.eventText(event) }) },
  onSelect(event: WechatMiniprogram.CustomEvent<{ currentSelectedFiles: Array<UploadView[]> }>) {
    const selected = event.detail.currentSelectedFiles.flat()
    void this.uploadSelected(selected)
  },
  async uploadSelected(selected: UploadView[]) {
    const available = 9 - this.data.images.length
    for (const file of selected.slice(0, available)) {
      const model: UploadedImage = { localPath: file.url, remotePath: '', status: 'uploading' }
      this.setData({ images: [...this.data.images, model] }); this.syncFiles()
      try { model.remotePath = await uploadBlogImage(file.url); model.status = 'done' }
      catch (error) { model.status = 'failed'; model.error = error instanceof Error ? error.message : '上传失败' }
      this.setData({ images: [...this.data.images] }); this.syncFiles()
    }
  },
  async retry(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    const image = this.data.images[index]
    if (!image || image.status !== 'failed') return
    image.status = 'uploading'; this.setData({ images: [...this.data.images] }); this.syncFiles()
    try { image.remotePath = await uploadBlogImage(image.localPath); image.status = 'done' }
    catch (error) { image.status = 'failed'; image.error = error instanceof Error ? error.message : '上传失败' }
    this.setData({ images: [...this.data.images] }); this.syncFiles()
  },
  async remove(event: WechatMiniprogram.CustomEvent<{ index: number }>) {
    const image = this.data.images[event.detail.index]
    if (image?.remotePath) await deleteBlogImage(image.remotePath).catch(() => undefined)
    this.setData({ images: this.data.images.filter((_, index) => index !== event.detail.index) }); this.syncFiles()
  },
  syncFiles() {
    this.setData({ files: this.data.images.map((image) => ({ url: image.localPath, name: image.localPath, type: 'image' as const, status: image.status === 'uploading' ? 'loading' as const : image.status, percent: image.status === 'done' ? 100 : 0 })) })
  },
  async submit() {
    if (!this.data.title.trim() || !this.data.content.trim()) { wx.showToast({ title: '请填写标题和内容', icon: 'none' }); return }
    if (this.data.images.some((image) => image.status !== 'done')) { wx.showToast({ title: '请先处理上传失败的图片', icon: 'none' }); return }
    this.setData({ submitting: true })
    try {
      const result = await createBlog({ title: this.data.title.trim(), content: this.data.content.trim(), shopId: this.data.shopId || undefined, images: this.data.images.map((image) => image.remotePath).join(',') })
      if (!result.data) return
      wx.disableAlertBeforeUnload?.()
      this.published = true
      this.selectComponent('#publish-motion')?.show(1200)
      setTimeout(() => wx.switchTab({ url: '/pages/discover/index' }), 900)
    } finally { this.setData({ submitting: false }) }
  },
  leave() {
    if (!this.data.images.length) { wx.navigateBack(); return }
    wx.showModal({ title: '放弃发布？', content: '离开后会清理本次已上传但未发布的图片。', confirmText: '清理并离开', confirmColor: '#ff5f57', success: async (result) => { if (!result.confirm) return; await Promise.all(this.data.images.filter((image) => image.remotePath).map((image) => deleteBlogImage(image.remotePath).catch(() => undefined))); this.published = true; wx.disableAlertBeforeUnload?.(); wx.navigateBack() } })
  },
  eventText(event: WechatMiniprogram.CustomEvent): string { const detail = event.detail as unknown as string | { value: string }; return typeof detail === 'string' ? detail : detail.value },
  published: false
})
