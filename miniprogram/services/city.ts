import { listCities } from "../api/city";
import { resolveLocationContext } from "../api/location";
import { updateCityPreference } from "../api/user";
import { authStore } from "../store/auth";
import { cityStore } from "../store/city";
import type { City, LocationContext } from "../types";

let locatingPromise: Promise<LocationContext> | undefined;

class StaleLocationRequestError extends Error {
  constructor() {
    super("定位请求已过期");
    this.name = "StaleLocationRequestError";
  }
}

export async function ensureSelectedCity(): Promise<City> {
  const selectedCity = cityStore.getState().selectedCity;
  if (selectedCity) return selectedCity;

  let result;
  try {
    result = await listCities();
  } catch {
    // 城市字典暂不可用时仍保留杭州作为离线浏览降级，不阻塞首页。
    cityStore.setDefaultCity();
    return cityStore.getState().selectedCity!;
  }
  const initialized = cityStore.initialize(result.data || []);
  if (!initialized) throw new Error("当前暂无可用城市");
  return initialized;
}

/** 首页及本地发现入口读取当前生效城市；手动/默认模式不触发定位。 */
export async function ensureDiscoveryContext(): Promise<LocationContext> {
  const current = cityStore.getState();
  if (current.selectedCity && current.selectionMode !== "REAL_LOCATION") {
    if (current.selectionMode === "DEFAULT_CITY" && locatingPromise) {
      try {
        return await locatingPromise;
      } catch {
        // 默认城市继续承担定位失败后的可浏览降级。
      }
    }
    return cityStore.context()!;
  }
  if (current.locationContext && current.selectionMode === "REAL_LOCATION") {
    return current.locationContext;
  }
  const selected = await ensureSelectedCity();
  // 应用启动可能正在执行首轮真实定位；发现页等待这一次结果，避免先闪现默认城市后又悄悄切换。
  if (locatingPromise) {
    try {
      return await locatingPromise;
    } catch {
      // 定位失败仍按已选/默认城市继续浏览。
    }
  }
  return cityStore.context() || { ...selected, selectionMode: "DEFAULT_CITY" };
}

/** 显式请求真实定位；仅此入口会从手动/默认城市切换回真实定位。 */
export async function ensureRealLocation(
  force = false,
): Promise<LocationContext> {
  const current = cityStore.getState();
  if (
    !force &&
    current.selectedCity &&
    current.selectionMode !== "REAL_LOCATION"
  ) {
    return cityStore.context()!;
  }
  if (!force && current.locationStatus === "READY" && current.locationContext) {
    return current.locationContext;
  }
  if (locatingPromise) return locatingPromise;

  locatingPromise = (async () => {
    // 先恢复本地城市偏好，避免应用启动时用真实定位覆盖用户上次手动选择。
    if (!force && !cityStore.getState().selectedCity)
      await ensureSelectedCity();
    const prepared = cityStore.getState();
    if (
      !force &&
      prepared.selectedCity &&
      prepared.selectionMode !== "REAL_LOCATION"
    ) {
      return cityStore.context()!;
    }
    cityStore.setLocation("LOCATING");
    const requestedState = cityStore.getState();
    const requestedCity = requestedState.selectedCity?.code;
    const requestedMode = requestedState.selectionMode;
    try {
      const coordinates = await requestLocation();
      const latest = cityStore.getState();
      if (
        latest.selectionMode !== requestedMode ||
        latest.selectedCity?.code !== requestedCity
      ) {
        throw new StaleLocationRequestError();
      }
      const result = await resolveLocationContext(coordinates);
      const afterResolve = cityStore.getState();
      if (
        afterResolve.selectionMode !== requestedMode ||
        afterResolve.selectedCity?.code !== requestedCity
      ) {
        throw new StaleLocationRequestError();
      }
      if (!result.data) throw new Error(result.message || "定位解析失败");
      const context: LocationContext = {
        code: result.data.cityCode,
        name: result.data.cityName,
        districtCode: result.data.districtCode,
        districtName: result.data.districtName,
        poiName: result.data.poiName,
        locationLabel: result.data.locationLabel,
        longitude: result.data.longitude,
        latitude: result.data.latitude,
        accuracy: result.data.accuracy,
        selectionMode: "REAL_LOCATION",
      };
      cityStore.setLocationContext(context);
      return context;
    } catch (error) {
      const state = cityStore.getState();
      if (error instanceof StaleLocationRequestError) throw error;
      if (state.selectionMode === "MANUAL_CITY") {
        cityStore.setLocation(isLocationDenied(error) ? "DENIED" : "FAILED");
        throw error;
      }
      const fallback = await ensureSelectedCity().catch(
        () => state.selectedCity,
      );
      if (fallback)
        cityStore.setDefaultCity(
          fallback,
          isLocationDenied(error) ? "DENIED" : "FAILED",
        );
      throw error;
    }
  })()
    .catch((error) => {
      throw error;
    })
    .finally(() => {
      locatingPromise = undefined;
    });
  return locatingPromise;
}

/** 兼容旧调用方；新发现页面应使用 ensureDiscoveryContext。 */
export const ensureLocatedCity = ensureRealLocation;

export async function loadAvailableCities(): Promise<City[]> {
  const result = await listCities();
  if (!Array.isArray(result.data)) {
    throw new Error("城市列表返回格式异常，请稍后重试");
  }
  return result.data;
}

export function syncCityPreference(cityCode: string): void {
  if (!authStore.isLoggedIn() || !cityCode) return;
  void updateCityPreference(cityCode).catch(() => undefined);
}

export async function locateForNearby(): Promise<{
  status: "READY" | "DENIED" | "FAILED";
  longitude?: number;
  latitude?: number;
}> {
  try {
    const context = await ensureRealLocation(true);
    return {
      status: "READY",
      longitude: context.longitude,
      latitude: context.latitude,
    };
  } catch (error) {
    const denied = isLocationDenied(error);
    const status = denied ? "DENIED" : "FAILED";
    return { status };
  }
}

function requestLocation(): Promise<{
  longitude: number;
  latitude: number;
}> {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: "gcj02",
      timeout: 5000,
      success(result) {
        resolve({
          longitude: result.longitude,
          latitude: result.latitude,
        });
      },
      fail: reject,
    });
  });
}

function isLocationDenied(error: unknown): boolean {
  const message =
    typeof error === "object" && error && "errMsg" in error
      ? String((error as { errMsg?: string }).errMsg || "")
      : "";
  return /auth deny|auth denied|permission denied/i.test(message);
}

export function locationFailureMessage(error: unknown): string {
  if (isLocationDenied(error)) {
    return "定位失败，请在微信设置中允许访问位置后重试";
  }
  return error instanceof Error ? error.message : "定位失败，请稍后重试";
}

export function openLocationSettings(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof wx.openSetting !== "function") {
      resolve(false);
      return;
    }
    wx.openSetting({
      success(result) {
        resolve(Boolean(result.authSetting?.["scope.userLocation"]));
      },
      fail() {
        resolve(false);
      },
    });
  });
}
