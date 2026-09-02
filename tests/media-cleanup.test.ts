import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteTemporaryImage,
  flushMediaCleanupQueue,
} from "../miniprogram/services/media";

const deleteMediaImageMock = vi.hoisted(() => vi.fn());

vi.mock("../miniprogram/api/media", () => ({
  deleteMediaImage: deleteMediaImageMock,
  uploadMediaImage: vi.fn(),
}));

describe("temporary media cleanup", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    deleteMediaImageMock.mockReset();
    vi.stubGlobal("wx", {
      getStorageSync: (key: string) => storage.get(key) || "",
      setStorageSync: (key: string, value: string) => storage.set(key, value),
      removeStorageSync: (key: string) => storage.delete(key),
    });
  });

  it("queues a failed deletion and retries it on the next flush", async () => {
    deleteMediaImageMock.mockRejectedValueOnce(new Error("network"));

    await expect(deleteTemporaryImage("media-1")).rejects.toThrow("network");
    expect(JSON.parse(storage.get("roamly_media_cleanup_v1") || "[]")).toEqual([
      "media-1",
    ]);

    deleteMediaImageMock.mockResolvedValueOnce({ data: null });
    await flushMediaCleanupQueue();

    expect(deleteMediaImageMock).toHaveBeenCalledTimes(2);
    expect(storage.has("roamly_media_cleanup_v1")).toBe(false);
  });
});
