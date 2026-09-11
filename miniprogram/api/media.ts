import { getEnvironment } from "../config/env";
import { authStore } from "../store/auth";
import type {
  ErrorResult,
  MediaAsset,
  MediaUploadPurpose,
  Result,
} from "../types";
import { navigateToLogin } from "../utils/navigation";
import { ApiError, request } from "../utils/request";
import { session } from "../utils/session";

interface MediaAssetWire {
  id: string;
  path: string;
  width?: number;
  height?: number;
  mimeType: string;
  size: number;
}

export function uploadMediaImage(
  filePath: string,
  purpose: MediaUploadPurpose,
): Promise<Result<MediaAsset>> {
  const token = session.getToken();
  if (!token) {
    return Promise.reject(new ApiError("请先登录", 401, "UNAUTHORIZED"));
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getEnvironment().apiBaseUrl}/v1/media/images`,
      filePath,
      name: "file",
      formData: { purpose },
      timeout: 30000,
      header: { Authorization: `Bearer ${token}` },
      success(response) {
        try {
          const result = JSON.parse(response.data) as
            | Result<MediaAssetWire>
            | ErrorResult;
          if (response.statusCode === 401) {
            authStore.clear();
            navigateToLogin();
            reject(new ApiError("登录已过期，请重新登录", 401, "UNAUTHORIZED"));
            return;
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = result as ErrorResult;
            reject(
              new ApiError(
                error.message || `上传失败（${response.statusCode}）`,
                response.statusCode,
                error.code,
              ),
            );
            return;
          }
          const success = result as Result<MediaAssetWire>;
          if (success.data && !success.data.path) {
            reject(new ApiError("上传响应缺少资源路径", response.statusCode));
            return;
          }
          resolve({
            ...success,
            data: success.data
              ? {
                  id: success.data.id,
                  url: success.data.path,
                  width: success.data.width,
                  height: success.data.height,
                  mimeType: success.data.mimeType,
                  size: success.data.size,
                }
              : null,
          });
        } catch {
          reject(new ApiError("上传响应格式错误", response.statusCode));
        }
      },
      fail(error) {
        reject(
          new ApiError(
            error.errMsg.includes("timeout") ? "上传超时" : "上传失败",
          ),
        );
      },
    });
  });
}

export const deleteMediaImage = (mediaId: string): Promise<Result<null>> =>
  request(`/v1/media/images/${mediaId}`, {
    method: "DELETE",
    dedupe: false,
    showError: false,
  });
