import type { MediaAsset } from "../../types";
import { imageUrl } from "../../utils/media";

Component({
  properties: {
    media: { type: Array, value: [] },
  },
  data: {
    displayMedia: [] as MediaAsset[],
    gridSize: "empty",
  },
  observers: {
    media(media: MediaAsset[]) {
      const displayMedia = (media || []).slice(0, 9);
      const gridSize =
        displayMedia.length === 1
          ? "single"
          : displayMedia.length === 2
            ? "double"
            : "multiple";
      this.setData({ displayMedia, gridSize });
    },
  },
  methods: {
    onPreview(event: WechatMiniprogram.TouchEvent) {
      const index = Number(event.currentTarget.dataset.index || 0);
      const urls = (this.data.displayMedia as MediaAsset[]).map((item) =>
        imageUrl(item.url),
      );
      const current = urls[index];
      if (!current) return;
      wx.previewImage({ current, urls });
      this.triggerEvent("preview", { index });
    },
  },
});
