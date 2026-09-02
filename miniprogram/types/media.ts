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
}
