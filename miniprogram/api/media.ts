import { getEnvironment } from "../config/env";
import type { ErrorResult, MediaAsset, Result } from "../types";
import { ApiError, request } from "../utils/request";
import { session } from "../utils/session";

export function uploadMediaImage(
  filePath: string,
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
      timeout: 30000,
      header: { Authorization: `Bearer ${token}` },
      success(response) {
        try {
          const result = JSON.parse(response.data) as
            | Result<MediaAsset>
            | ErrorResult;
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
          resolve(result as Result<MediaAsset>);
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
  });
