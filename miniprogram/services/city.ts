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
