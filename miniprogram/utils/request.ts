import { getEnvironment } from "../config/env";
import { authStore } from "../store/auth";
import type { ErrorResult, Result } from "../types";
import { navigateToLogin } from "./navigation";
import { session } from "./session";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 0,
    public readonly code = "NETWORK_ERROR",
    public readonly fieldErrors: ErrorResult["fieldErrors"] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE";
export type AuthMode = "public" | "optional" | "required";
interface RequestOptions<TBody> {
  method?: Method;
  data?: TBody;
  auth?: AuthMode;
  dedupe?: boolean;
  showError?: boolean;
  headers?: Record<string, string>;
}
const pending = new Map<string, Promise<Result<unknown>>>();

export function request<
  T,
  TBody extends WechatMiniprogram.IAnyObject = WechatMiniprogram.IAnyObject,
>(path: string, options: RequestOptions<TBody> = {}): Promise<Result<T>> {
  const method = options.method || "GET";
  const authMode = options.auth || "required";
  const key = `${method}:${path}:${JSON.stringify(options.data || {})}`;
  if (options.dedupe !== false && pending.has(key))
    return pending.get(key) as Promise<Result<T>>;
  const token = authMode === "public" ? "" : session.getToken();
  if (authMode === "required" && !token) {
    navigateToLogin();
    return Promise.reject(new ApiError("请先登录", 401, "UNAUTHORIZED"));
  }
  const promise = new Promise<Result<T>>((resolve, reject) => {
    wx.request<Result<T> | ErrorResult>({
      url: `${getEnvironment().apiBaseUrl}${path}`,
      method,
      data: options.data,
      timeout: 12000,
      header: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      success(response) {
        if (response.statusCode === 401) {
          // 推荐流等可选登录接口携带了过期 token 时，清掉旧会话并
          // 以游客身份自动重试，避免首页被误报为“当前会话已失效”。
          if (authMode === "optional" && token) {
            authStore.clear();
            request<T, TBody>(path, {
              ...options,
              auth: "optional",
              dedupe: false,
              showError: false,
            })
              .then(resolve)
              .catch(reject);
            return;
          }
          authStore.clear();
          if (authMode === "required") navigateToLogin();
          reject(
            new ApiError(
              authMode === "required"
                ? "登录已过期，请重新登录"
                : "当前会话已失效",
              401,
              "UNAUTHORIZED",
            ),
          );
          return;
        }
        if (response.statusCode === 204) {
          resolve({ code: "OK", message: "操作成功", data: null });
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = response.data as ErrorResult;
          reject(
            new ApiError(
              error?.message || `服务暂时不可用（${response.statusCode}）`,
              response.statusCode,
              error?.code,
              error?.fieldErrors,
            ),
          );
          return;
        }
        resolve(response.data as Result<T>);
      },
      fail(error) {
        reject(
          new ApiError(
            error.errMsg.includes("timeout")
              ? "请求超时，请稍后重试"
              : "网络连接失败",
          ),
        );
      },
    });
  })
    .catch((error: ApiError) => {
      if (options.showError !== false && error.statusCode !== 401)
        wx.showToast({ title: error.message, icon: "none" });
      throw error;
    })
    .finally(() => pending.delete(key));
  pending.set(key, promise as Promise<Result<unknown>>);
  return promise;
}
