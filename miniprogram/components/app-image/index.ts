import {
  imageError,
  imageUrl,
  resolveRenderableImage,
} from "../../utils/media";

Component({
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
      this.setData({ resolveVersion: version });
      try {
        const resolved = await resolveRenderableImage(imageUrl(src, kind));
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
