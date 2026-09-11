import { getEnvironment } from "../config/env";

/** 使用微信系统图片编辑器裁剪、旋转并调整普通上传图片。 */
export function editImageForUpload(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.editImage({
      src: filePath,
      success: (result) => resolve(result.tempFilePath),
      fail: reject,
    });
  });
}

/** 使用微信系统裁剪器强制用户头像为正方形。 */
export function cropAvatarImage(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.cropImage({
      src: filePath,
      cropScale: "1:1",
      success: (result) => resolve(result.tempFilePath),
      fail: reject,
    });
  });
}

/** 读取微信临时文件大小，供编辑完成后的上传校验复用。 */
export function imageFileSize(filePath: string): number {
  const stats = wx.getFileSystemManager().statSync(filePath);
  return Array.isArray(stats) ? 0 : stats.size;
}

/** 确保编辑器拿到仍然可读的本地文件；草稿恢复后临时文件失效时下载服务端副本。 */
export function prepareImageForEdit(
  localPath: string,
  fallbackUrl?: string,
): Promise<string> {
  if (localPath && isReadableLocalFile(localPath))
    return Promise.resolve(localPath);
  if (!fallbackUrl)
    return Promise.reject(new Error("图片文件已失效，请重新选择"));
  const url = /^https?:\/\//.test(fallbackUrl)
    ? fallbackUrl
    : `${getEnvironment().assetBaseUrl}${fallbackUrl.startsWith("/") ? fallbackUrl : `/${fallbackUrl}`}`;
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      timeout: 30000,
      success: (response) => {
        if (response.statusCode === 200) resolve(response.tempFilePath);
        else reject(new Error(`图片读取失败（${response.statusCode}）`));
      },
      fail: reject,
    });
  });
}

function isReadableLocalFile(path: string): boolean {
  if (!path || /^https?:\/\//.test(path)) return false;
  try {
    wx.getFileSystemManager().accessSync(path);
    return true;
  } catch {
    // 某些微信版本对临时路径不支持 accessSync，但路径本身仍可交给编辑器。
    return path.startsWith("wxfile://") || path.startsWith("http://tmp/");
  }
}

export function isImageEditCanceled(error: unknown): boolean {
  const message =
    typeof error === "object" && error && "errMsg" in error
      ? String((error as { errMsg: string }).errMsg)
      : error instanceof Error
        ? error.message
        : "";
  return message.toLowerCase().includes("cancel");
}
