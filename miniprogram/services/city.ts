import { listCities } from "../api/city";
import { resolveLocationContext } from "../api/location";
import { updateCityPreference } from "../api/user";
import { authStore } from "../store/auth";
import { cityStore } from "../store/city";
import type { City, LocationContext } from "../types";

let locatingPromise: Promise<LocationContext> | undefined;

export async function ensureSelectedCity(): Promise<City> {
  const selectedCity = cityStore.getState().selectedCity;
  if (selectedCity) return selectedCity;

  const result = await listCities();
  const initialized = cityStore.initialize(result.data || []);
  if (!initialized) throw new Error("当前暂无可用城市");
  return initialized;
}

/** 首页及所有本地发现入口必须使用真实定位城市。 */
export async function ensureLocatedCity(force = false): Promise<LocationContext> {
  const current = cityStore.getState();
  if (!force && current.locationStatus === "READY" && current.locationContext) {
    return current.locationContext;
  }
  if (locatingPromise) return locatingPromise;

  cityStore.setLocation("LOCATING");
  locatingPromise = (async () => {
    const coordinates = await requestLocation();
    const result = await resolveLocationContext(coordinates);
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
    };
    cityStore.setLocationContext(context);
    return context;
  })()
    .catch((error) => {
      cityStore.setLocation(isLocationDenied(error) ? "DENIED" : "FAILED");
      throw error;
    })
    .finally(() => {
      locatingPromise = undefined;
    });
  return locatingPromise;
}

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
  const requestedCityCode = cityStore.getState().selectedCity?.code;
  cityStore.setLocation("LOCATING");
  try {
    const coordinates = await requestLocation();
    if (cityStore.getState().selectedCity?.code !== requestedCityCode) {
      return { status: "FAILED" };
    }
    cityStore.setLocation("READY", coordinates);
    return { status: "READY", ...coordinates };
  } catch (error) {
    const denied = isLocationDenied(error);
    const status = denied ? "DENIED" : "FAILED";
    cityStore.setLocation(status);
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
