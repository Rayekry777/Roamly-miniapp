import { beforeEach, describe, expect, it, vi } from "vitest";
import { CityStore } from "../miniprogram/store/city";

describe("city store", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("wx", {
      getStorageSync: (key: string) => storage.get(key) || "",
      setStorageSync: (key: string, value: string) => storage.set(key, value),
    });
  });

  it("restores the selected city or falls back to the first available city", () => {
    storage.set("roamly_selected_city_v1", "SHANGHAI");
    const store = new CityStore();
    const selected = store.initialize([
      { code: "HANGZHOU", name: "杭州" },
      { code: "SHANGHAI", name: "上海" },
    ]);

    expect(selected).toEqual({ code: "SHANGHAI", name: "上海" });
    expect(store.getState().selectedCity).toEqual(selected);
  });

  it("clears precise coordinates after location failure or city switching", () => {
    const store = new CityStore();
    store.initialize([{ code: "HANGZHOU", name: "杭州" }]);
    store.setLocation("READY", { longitude: 120.1, latitude: 30.2 });
    store.setLocation("FAILED");

    expect(store.getState()).toEqual({
      selectedCity: { code: "HANGZHOU", name: "杭州" },
      locationStatus: "FAILED",
      selectionMode: "REAL_LOCATION",
    });

    store.setLocation("READY", { longitude: 120.1, latitude: 30.2 });
    store.select({ code: "SHANGHAI", name: "上海" });
    expect(store.getState()).toEqual({
      selectedCity: { code: "SHANGHAI", name: "上海" },
      locationStatus: "IDLE",
      selectionMode: "MANUAL_CITY",
    });
  });
});
