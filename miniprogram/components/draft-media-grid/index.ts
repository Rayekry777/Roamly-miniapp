import type { UploadedMedia } from "../../types";
import { imageUrl } from "../../utils/media";

interface DraftMediaView extends UploadedMedia {
  displayUrl: string;
  fallbackUrl: string;
}

Component({
  properties: {
    media: { type: Array, value: [] },
    disabled: { type: Boolean, value: false },
  },
  data: {
    displayMedia: [] as DraftMediaView[],
  },
  observers: {
    media(media: UploadedMedia[]) {
      this.setData({
        displayMedia: (media || []).map((item) => ({
          ...item,
          // 当前页面优先使用微信本地临时文件，编辑完成后立即可见；
          // 临时文件失效时再回退到服务端媒体地址。
          displayUrl:
            item.localPath || (item.asset ? imageUrl(item.asset.url) : ""),
          fallbackUrl: item.asset ? imageUrl(item.asset.url) : "",
        })),
      });
    },
  },
  methods: {
    onAdd() {
      if (!this.data.disabled) this.triggerEvent("add");
    },
    onRetry(event: WechatMiniprogram.TouchEvent) {
      this.triggerByPath("retry", event);
    },
    onRemove(event: WechatMiniprogram.TouchEvent) {
      this.triggerByPath("remove", event);
    },
    onMoveLeft(event: WechatMiniprogram.TouchEvent) {
      this.triggerByPath("move", event, { direction: -1 });
    },
    onMoveRight(event: WechatMiniprogram.TouchEvent) {
      this.triggerByPath("move", event, { direction: 1 });
    },
    onImageTap(event: WechatMiniprogram.TouchEvent) {
      const index = Number(event.currentTarget.dataset.index || 0);
      const item = (this.data.displayMedia as DraftMediaView[])[index];
      if (!this.data.disabled && item) {
        this.triggerEvent("edit", {
          path: item.localPath,
          url: item.displayUrl,
        });
        return;
      }
      const urls = (this.data.displayMedia as DraftMediaView[]).map(
        (item) => item.displayUrl,
      );
      const current = urls[index];
      if (current) wx.previewImage({ current, urls });
    },
    onImageError(event: WechatMiniprogram.TouchEvent) {
      const index = Number(event.currentTarget.dataset.index || 0);
      const item = (this.data.displayMedia as DraftMediaView[])[index];
      if (!item?.fallbackUrl || item.displayUrl === item.fallbackUrl) return;
      this.setData({ [`displayMedia[${index}].displayUrl`]: item.fallbackUrl });
    },
    triggerByPath(
      eventName: string,
      event: WechatMiniprogram.TouchEvent,
      detail: Record<string, unknown> = {},
    ) {
      if (this.data.disabled) return;
      this.triggerEvent(eventName, {
        path: String(event.currentTarget.dataset.path || ""),
        ...detail,
      });
    },
  },
});
