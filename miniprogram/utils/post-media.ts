const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_IMAGE_TYPES = new Set(["jpeg", "png"]);

export interface PostImageSelection {
  files: WechatMiniprogram.MediaFile[];
  rejectedMessages: string[];
}

export async function choosePostImages(
  count: number,
): Promise<PostImageSelection> {
  const response = await wx.chooseMedia({
    count: Math.max(0, Math.min(9, count)),
    mediaType: ["image"],
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
  });
  const files: WechatMiniprogram.MediaFile[] = [];
  const rejectedMessages: string[] = [];

  for (const file of response.tempFiles) {
    const error = await validatePostImage(file);
    if (error) rejectedMessages.push(error);
    else files.push(file);
  }
  return { files, rejectedMessages };
}

export async function validatePostImage(
  file: WechatMiniprogram.MediaFile,
): Promise<string | null> {
  if (file.size > MAX_IMAGE_SIZE) return "单张图片不能超过 10MB";

  const extension = file.tempFilePath.split(".").pop()?.toLowerCase() || "";
  if (ALLOWED_IMAGE_EXTENSIONS.has(extension)) return null;

  try {
    const info = await getImageInfo(file.tempFilePath);
    return ALLOWED_IMAGE_TYPES.has(info.type)
      ? null
      : "仅支持 JPEG、PNG 或 WebP 图片";
  } catch {
    return "无法识别图片格式，请重新选择";
  }
}

function getImageInfo(
  src: string,
): Promise<WechatMiniprogram.GetImageInfoSuccessCallbackResult> {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({ src, success: resolve, fail: reject });
  });
}
