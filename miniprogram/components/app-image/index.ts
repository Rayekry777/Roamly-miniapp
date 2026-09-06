import {
  imageError,
  imageUrl,
  resolveRenderableImage,
} from "../../utils/media";

Component({
  // 允许页面通过 custom-class 控制图片容器尺寸，避免商品卡中的图片被压成零宽。
  // shared keeps the existing page-level sizing contract for this generic image
  // component while retaining the component's own fallback styles.
  options: { styleIsolation: "shared" },
  properties: {
    src: { type: String, value: "" },
    kind: { type: String, value: "photo" },
    mode: { type: String, value: "aspectFill" },
    lazy: { type: Boolean, value: true },
    customClass: { type: String, value: "" },
  },
  data: { resolved: "", resolveVersion: 0 },
  observers: {
    "src,kind"(src: string, kind: "photo" | "avatar" | "category") {
      void this.resolveSource?.(src, kind);
    },
  },
  methods: {
    async resolveSource(src: string, kind: "photo" | "avatar" | "category") {
      const version = this.data.resolveVersion + 1;
      const fallback = imageUrl(src, kind);
      this.setData({ resolveVersion: version, resolved: fallback });
      try {
        const resolved = await resolveRenderableImage(fallback);
        if (version === this.data.resolveVersion) this.setData({ resolved });
      } catch {
        if (version === this.data.resolveVersion)
          this.setData({ resolved: imageError(kind) });
      }
    },
    onError() {
      this.setData({
        resolved: imageError(this.data.kind as "photo" | "avatar" | "category"),
      });
    },
  },
});
