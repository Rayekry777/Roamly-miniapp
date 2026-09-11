import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteMediaImage, uploadMediaImage } from "../miniprogram/api/media";

describe("media asset API", () => {
  beforeEach(() => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getDeviceInfo: () => ({ platform: "devtools" }),
      getStorageSync: () => "token-value",
      request: vi.fn((options) =>
        options.success({ statusCode: 204, data: null }),
      ),
      uploadFile: vi.fn((options) =>
        options.success({
          statusCode: 201,
          data: JSON.stringify({
            code: "OK",
            message: "操作成功",
            data: {
              id: "9223372036854775807",
              path: "/media/user/post/7/2026/09/example.webp",
              width: 1200,
              height: 900,
              mimeType: "image/webp",
              size: 1024,
            },
          }),
        }),
      ),
    });
  });

  it("uploads to the media endpoint with Bearer authorization", async () => {
    const result = await uploadMediaImage("temp/example.webp", "POST");

    expect(result.data?.id).toBe("9223372036854775807");
    expect(result.data?.url).toBe(
      "/media/user/post/7/2026/09/example.webp",
    );
    expect(vi.mocked(wx.uploadFile).mock.calls[0]?.[0]).toMatchObject({
      url: "http://127.0.0.1:8081/v1/media/images",
      filePath: "temp/example.webp",
      name: "file",
      formData: { purpose: "POST" },
      header: { Authorization: "Bearer token-value" },
    });
  });

  it("rejects before upload when the session is missing", async () => {
    vi.stubGlobal("wx", {
      getStorageSync: () => "",
      uploadFile: vi.fn(),
    });

    await expect(
      uploadMediaImage("temp/example.webp", "POST"),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
    expect(wx.uploadFile).not.toHaveBeenCalled();
  });

  it("deletes a media asset by string id", async () => {
    await deleteMediaImage("9223372036854775807");

    expect(vi.mocked(wx.request).mock.calls[0]?.[0]).toMatchObject({
      url: "http://127.0.0.1:8081/v1/media/images/9223372036854775807",
      method: "DELETE",
      header: { Authorization: "Bearer token-value" },
    });
  });
});
