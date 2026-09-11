import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  choosePostImages,
  validatePostImage,
} from "../miniprogram/utils/post-media";

function mediaFile(
  tempFilePath: string,
  size = 1024,
): WechatMiniprogram.MediaFile {
  return { tempFilePath, size } as WechatMiniprogram.MediaFile;
}

describe("post image validation", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("rejects a file larger than 10MB", async () => {
    await expect(
      validatePostImage(mediaFile("large.jpg", 10 * 1024 * 1024 + 1)),
    ).resolves.toBe("单张图片不能超过 10MB");
  });

  it("accepts JPEG, PNG and WebP extensions", async () => {
    await expect(validatePostImage(mediaFile("a.jpeg"))).resolves.toBeNull();
    await expect(validatePostImage(mediaFile("b.png"))).resolves.toBeNull();
    await expect(validatePostImage(mediaFile("c.webp"))).resolves.toBeNull();
  });

  it("uses image metadata when a temporary path has no extension", async () => {
    vi.stubGlobal("wx", {
      getImageInfo: vi.fn((options) =>
        options.success({ type: "jpeg", width: 100, height: 100 }),
      ),
    });

    await expect(
      validatePostImage(mediaFile("wxfile://tmp_1")),
    ).resolves.toBeNull();
  });

  it("keeps the original file on first selection and defers editing to the thumbnail", async () => {
    const chooseMedia = vi.fn().mockResolvedValue({
      tempFiles: [{ tempFilePath: "wxfile://photo.jpg", size: 1024 }],
    });
    vi.stubGlobal("wx", { chooseMedia });

    const result = await choosePostImages(9);

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.tempFilePath).toBe("wxfile://photo.jpg");
    expect(chooseMedia).toHaveBeenCalledOnce();
  });
});
