import { listCities } from "../api/city";
import { updateCityPreference } from "../api/user";
import { authStore } from "../store/auth";
import { cityStore } from "../store/city";
import type { City } from "../types";

export async function ensureSelectedCity(): Promise<City> {
  const selectedCity = cityStore.getState().selectedCity;
  if (selectedCity) return selectedCity;

  const result = await listCities();
  const initialized = cityStore.initialize(result.data || []);
  if (!initialized) throw new Error("当前暂无可用城市");
  return initialized;
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
