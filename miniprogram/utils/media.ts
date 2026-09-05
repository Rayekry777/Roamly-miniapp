import { getEnvironment } from "../config/env";

const fallbacks = {
  photo: "/assets/images/photo-placeholder.svg",
  avatar: "/assets/images/avatar-placeholder.svg",
  category: "/assets/images/category-placeholder.svg",
};
const categoryIcons: Record<string, string> = {
  ms: "food",
  ktv: "ktv",
  lrmf: "beauty",
  mjmj: "nails",
  amzl: "massage",
  spa: "spa",
  qzyl: "kids",
  jiuba: "bar",
  hpg: "party",
  jsyd: "fitness",
};
const downloadedImages = new Map<string, string>();

export function splitImages(value?: string): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function imageUrl(
  value?: string,
  kind: keyof typeof fallbacks = "photo",
): string {
  if (!value) return fallbacks[kind];
  const assetBaseUrl = getEnvironment().assetBaseUrl.replace(/\/$/, "");
  if (value.startsWith("/types/")) {
    const key = value.split("/").pop()?.split(".")[0]?.toLowerCase() || "";
    const icon = categoryIcons[key];
    return icon ? `/assets/images/category-${icon}.svg` : fallbacks.category;
  }
  if (
    value.startsWith("http://") &&
    !value.startsWith(`${assetBaseUrl}/`) &&
    !/^http:\/\/(127\.0\.0\.1|localhost|192\.168\.2\.102)(:\d+)?\//.test(value)
  )
    return value.replace(/^http:\/\//, "https://");
  if (/^https?:\/\//.test(value)) return value;
  if (value.startsWith("/imgs/"))
    return fallbacks[kind === "avatar" ? "avatar" : "photo"];
  return `${assetBaseUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

export function imageError(kind: keyof typeof fallbacks = "photo"): string {
  return fallbacks[kind];
}

export function resolveRenderableImage(url: string): Promise<string> {
  if (!url.startsWith("http://")) return Promise.resolve(url);
  const cached = downloadedImages.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      timeout: 12000,
      success(response) {
        if (response.statusCode !== 200) {
          reject(new Error(`图片下载失败（${response.statusCode}）`));
          return;
        }
        downloadedImages.set(url, response.tempFilePath);
        resolve(response.tempFilePath);
      },
      fail: reject,
    });
  });
}
