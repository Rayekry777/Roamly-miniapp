import { deleteMediaImage, uploadMediaImage } from "../api/media";
import type { MediaAsset, MediaUploadPurpose } from "../types";

const CLEANUP_QUEUE_KEY = "roamly_media_cleanup_v1";
let cleanupPromise: Promise<void> | null = null;

export async function uploadTemporaryImage(
  filePath: string,
  purpose: MediaUploadPurpose,
): Promise<MediaAsset> {
  const result = await uploadMediaImage(filePath, purpose);
  if (!result.data) throw new Error("上传结果缺少媒体资产");
  return result.data;
}

export async function deleteTemporaryImage(mediaId: string): Promise<void> {
  try {
    await deleteMediaImage(mediaId);
    removeFromCleanupQueue(mediaId);
  } catch (error) {
    enqueueMediaCleanup(mediaId);
    throw error;
  }
}

export function enqueueMediaCleanup(mediaId: string): void {
  if (!mediaId) return;
  const queue = new Set(readCleanupQueue());
  queue.add(mediaId);
  wx.setStorageSync(CLEANUP_QUEUE_KEY, JSON.stringify([...queue]));
}

export function flushMediaCleanupQueue(): Promise<void> {
  if (cleanupPromise) return cleanupPromise;
  cleanupPromise = flushCleanupQueue().finally(() => {
    cleanupPromise = null;
  });
  return cleanupPromise;
}

async function flushCleanupQueue(): Promise<void> {
  const queue = readCleanupQueue();
  for (const mediaId of queue) {
    try {
      await deleteMediaImage(mediaId);
      removeFromCleanupQueue(mediaId);
    } catch {
      // 弱网或服务不可用时保留任务，下次启动继续清理。
    }
  }
}

function readCleanupQueue(): string[] {
  const value = wx.getStorageSync(CLEANUP_QUEUE_KEY) as string | string[];
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function removeFromCleanupQueue(mediaId: string): void {
  const queue = readCleanupQueue().filter((item) => item !== mediaId);
  if (queue.length) wx.setStorageSync(CLEANUP_QUEUE_KEY, JSON.stringify(queue));
  else wx.removeStorageSync(CLEANUP_QUEUE_KEY);
}
