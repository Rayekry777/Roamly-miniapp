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
});
