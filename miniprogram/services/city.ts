import { listCities } from "../api/city";
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
