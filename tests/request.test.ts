import { beforeEach, describe, expect, it, vi } from "vitest";
import { authStore } from "../miniprogram/store/auth";
import { request } from "../miniprogram/utils/request";

describe("request", () => {
  beforeEach(() => {
    vi.stubGlobal("getCurrentPages", () => []);
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "token",
      request: vi.fn((options) =>
        options.success({
          statusCode: 200,
          data: { code: "OK", message: "操作成功", data: { id: "1" } },
        }),
      ),
      showToast: vi.fn(),
      navigateTo: vi.fn(),
    });
  });

  it("解析统一 Result 并携带 authorization", async () => {
    const result = await request<{ id: string }>("/v1/users/me");
    expect(result.data?.id).toBe("1");
    expect(vi.mocked(wx.request).mock.calls[0]?.[0].url).toBe(
      "http://127.0.0.1:8081/v1/users/me",
    );
    expect(vi.mocked(wx.request).mock.calls[0]?.[0].header).toEqual({
      Authorization: "Bearer token",
    });
  });

  it("生产基础地址只拼接一次 api 网关前缀", async () => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "release" } }),
      getStorageSync: () => "token",
      request: vi.fn((options) =>
        options.success({
          statusCode: 200,
          data: { code: "OK", message: "操作成功", data: null },
        }),
      ),
      showToast: vi.fn(),
      navigateTo: vi.fn(),
    });

    await request("/v1/users/me");

    expect(vi.mocked(wx.request).mock.calls[0]?.[0].url).toBe(
      "https://api.example.com/api/v1/users/me",
    );
  });

  it("401 清理完整会话并且只跳转一次登录页", async () => {
    authStore.token = "token";
    const removeStorageSync = vi.fn();
    const navigateTo = vi.fn((options) => options.complete?.());
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "token",
      removeStorageSync,
      request: vi.fn((options) =>
        options.success({ statusCode: 401, data: null }),
      ),
      showToast: vi.fn(),
      navigateTo,
    });
    await expect(request("/v1/users/me")).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(authStore.token).toBe("");
    expect(removeStorageSync).toHaveBeenCalledWith("roamly_satoken_v1");
    expect(navigateTo).toHaveBeenCalledTimes(1);
  });

  it("可选登录请求遇到过期 token 时自动降级为游客请求", async () => {
    authStore.token = "expired-token";
    const removeStorageSync = vi.fn();
    let attempts = 0;
    let storedToken = "expired-token";
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: vi.fn(() => storedToken),
      removeStorageSync: removeStorageSync.mockImplementation(() => {
        storedToken = "";
      }),
      request: vi.fn((options) => {
        attempts += 1;
        if (attempts === 1) {
          options.success({ statusCode: 401, data: null });
        } else {
          options.success({
            statusCode: 200,
            data: { code: "OK", message: "操作成功", data: { id: "guest" } },
          });
        }
      }),
      showToast: vi.fn(),
      navigateTo: vi.fn(),
    });

    await expect(
      request<{ id: string }>("/v1/feeds/recommended", {
        auth: "optional",
        data: { cityCode: "630100" },
      }),
    ).resolves.toMatchObject({ data: { id: "guest" } });
    expect(attempts).toBe(2);
    expect(vi.mocked(wx.request).mock.calls[1]?.[0].header).toEqual({});
    expect(vi.mocked(wx.navigateTo)).not.toHaveBeenCalled();
    expect(removeStorageSync).toHaveBeenCalledWith("roamly_satoken_v1");
  });

  it("保留服务端字段错误供表单定位", async () => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "token",
      request: vi.fn((options) =>
        options.success({
          statusCode: 400,
          data: {
            code: "VALIDATION_ERROR",
            message: "请求参数格式错误",
            fieldErrors: [{ field: "sectionId", message: "请选择探店分区" }],
          },
        }),
      ),
      showToast: vi.fn(),
      navigateTo: vi.fn(),
    });

    await expect(
      request("/v1/posts", { showError: false }),
    ).rejects.toMatchObject({
      statusCode: 400,
      fieldErrors: [{ field: "sectionId", message: "请选择探店分区" }],
    });
  });
});
