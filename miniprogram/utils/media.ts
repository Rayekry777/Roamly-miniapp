import { getEnvironment } from "../config/env";

const fallbacks = {
  photo: "/assets/images/photo-placeholder.png",
  avatar: "/assets/images/avatar-placeholder.png",
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
const categoryNameIcons: Array<[RegExp, string]> = [
  [/美食|餐饮|餐厅|料理|小吃/, "food"],
  [/休闲娱乐|休闲|娱乐|咖啡|甜品/, "party"],
  [/运动|健身|瑜伽|球馆/, "fitness"],
  [/美容|美发|美甲|美妆/, "beauty"],
  [/亲子|儿童|游乐|乐园/, "kids"],
  [/唱歌|KTV|ktv/, "ktv"],
  [/按摩|推拿|足疗/, "massage"],
  [/酒吧|清吧/, "bar"],
  [/派对|聚会|轰趴/, "party"],
  [/SPA|spa|水疗/, "spa"],
];
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
  if (value.startsWith("/assets/")) return value;
  const assetBaseUrl = getEnvironment().assetBaseUrl.replace(/\/$/, "");
  if (kind === "category") return categoryIconUrl(value);
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

export function categoryIconUrl(value?: string, label?: string): string {
  const raw = `${value || ""} ${label || ""}`.toLowerCase();
  const key = value?.split("/").pop()?.split(".")[0]?.toLowerCase() || "";
  const icon =
    categoryIcons[key] ||
    categoryNameIcons.find(([pattern]) => pattern.test(raw))?.[1];
  return icon ? `/assets/images/category-${icon}.svg` : fallbacks.category;
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
