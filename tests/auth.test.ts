import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loginByCode,
  loginByPassword,
  registerAndLogin,
  requestAuthCode,
} from "../miniprogram/services/auth";
import { authStore } from "../miniprogram/store/auth";

const apiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  passwordLogin: vi.fn(),
  sendCode: vi.fn(),
  getMe: vi.fn(),
}));

vi.mock("../miniprogram/api/user", () => apiMocks);

describe("login flow", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    apiMocks.login.mockReset();
    apiMocks.register.mockReset();
    apiMocks.passwordLogin.mockReset();
    apiMocks.sendCode.mockReset();
    apiMocks.getMe.mockReset();
    vi.stubGlobal("wx", {
      getStorageSync: (key: string) => storage.get(key) || "",
      setStorageSync: (key: string, value: string) => storage.set(key, value),
      removeStorageSync: (key: string) => storage.delete(key),
    });
    authStore.clear();
  });

  it("在请求当前用户前持久化新 Token", async () => {
    const user = { id: "7", nickName: "Roamly 用户", icon: "" };
    apiMocks.login.mockResolvedValue({
      code: "OK",
      message: "操作成功",
      data: {
        tokenType: "Bearer",
        accessToken: "new-token",
        expiresIn: 2592000,
      },
    });
    apiMocks.getMe.mockImplementation(async () => {
      expect(storage.get("roamly_satoken_v1")).toBe("new-token");
      return { code: "OK", message: "操作成功", data: user };
    });

    await expect(loginByCode("13800138000", "123456")).resolves.toEqual(user);
    expect(apiMocks.login).toHaveBeenCalledWith("13800138000", "123456");
    expect(apiMocks.getMe).toHaveBeenCalledTimes(1);
    expect(authStore.token).toBe("new-token");
    expect(authStore.user).toEqual(user);
  });

  it("当前用户获取失败时清理新 Token", async () => {
    apiMocks.login.mockResolvedValue({
      code: "OK",
      message: "操作成功",
      data: {
        tokenType: "Bearer",
        accessToken: "new-token",
        expiresIn: 2592000,
      },
    });
    apiMocks.getMe.mockRejectedValue(new Error("当前用户获取失败"));

    await expect(loginByCode("13800138000", "123456")).rejects.toThrow(
      "当前用户获取失败",
    );
    expect(storage.get("roamly_satoken_v1")).toBeUndefined();
    expect(authStore.token).toBe("");
    expect(authStore.user).toBeNull();
  });

  it("注册与密码登录复用同一会话落地流程", async () => {
    const user = { id: "7", nickName: "漫游者ABCD1234", icon: "" };
    const token = {
      code: "OK",
      message: "操作成功",
      data: {
        tokenType: "Bearer",
        accessToken: "new-token",
        expiresIn: 2592000,
      },
    };
    apiMocks.register.mockResolvedValue(token);
    apiMocks.passwordLogin.mockResolvedValue(token);
    apiMocks.getMe.mockResolvedValue({
      code: "OK",
      message: "操作成功",
      data: user,
    });

    await registerAndLogin("13800138000", "123456", "Roamly123", "Roamly123");
    await loginByPassword("13800138000", "Roamly123");

    expect(apiMocks.register).toHaveBeenCalledWith(
      "13800138000",
      "123456",
      "Roamly123",
      "Roamly123",
    );
    expect(apiMocks.passwordLogin).toHaveBeenCalledWith(
      "13800138000",
      "Roamly123",
    );
  });

  it("验证码请求显式携带登录或注册场景", async () => {
    apiMocks.sendCode.mockResolvedValue({
      code: "OK",
      message: "操作成功",
      data: null,
    });

    await requestAuthCode("13800138000", "LOGIN");
    await requestAuthCode("13900139000", "REGISTRATION");

    expect(apiMocks.sendCode).toHaveBeenNthCalledWith(
      1,
      "13800138000",
      "LOGIN",
    );
    expect(apiMocks.sendCode).toHaveBeenNthCalledWith(
      2,
      "13900139000",
      "REGISTRATION",
    );
  });
});
