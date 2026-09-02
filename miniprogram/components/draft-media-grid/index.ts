import type { UploadedMedia } from "../../types";
import { imageUrl } from "../../utils/media";

interface DraftMediaView extends UploadedMedia {
  displayUrl: string;
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
          displayUrl: item.asset ? imageUrl(item.asset.url) : item.localPath,
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
    onPreview(event: WechatMiniprogram.TouchEvent) {
      const index = Number(event.currentTarget.dataset.index || 0);
      const urls = (this.data.displayMedia as DraftMediaView[]).map(
        (item) => item.displayUrl,
      );
      const current = urls[index];
      if (current) wx.previewImage({ current, urls });
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
