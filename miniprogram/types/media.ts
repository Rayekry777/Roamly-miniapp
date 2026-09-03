export type MediaUploadStatus = "WAITING" | "UPLOADING" | "DONE" | "FAILED";

export interface MediaAsset {
  id: string;
  url: string;
  width?: number;
  height?: number;
  mimeType: string;
  size: number;
}

export interface UploadedMedia {
  localPath: string;
  asset?: MediaAsset;
  status: MediaUploadStatus;
  error?: string;
  /** 编辑已有业务资源时标记为已绑定，不能按临时媒体删除。 */
  bound?: boolean;
}
