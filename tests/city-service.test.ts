import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureRealLocation } from "../miniprogram/services/city";
import { cityStore } from "../miniprogram/store/city";

describe("homepage location service", () => {
  beforeEach(() => {
    vi.stubGlobal("wx", {
      setStorageSync: vi.fn(),
      getStorageSync: vi.fn(() => ""),
      getLocation: vi.fn(),
      request: vi.fn(),
    });
    cityStore.select({ code: "330100", name: "杭州" });
  });

  it("stores valid coordinates after locating", async () => {
    vi.mocked(wx.request).mockImplementation((options) => {
      options.success?.({
        statusCode: 200,
        data: {
          code: "OK",
          message: "",
          data: {
            cityCode: "330100",
            cityName: "杭州",
            districtCode: "330106",
            districtName: "西湖区",
            locationLabel: "杭州·西湖区",
            longitude: 120.1,
            latitude: 30.2,
            locationStatus: "READY",
          },
        },
      } as never);
      return undefined as never;
    });
    vi.mocked(wx.getLocation).mockImplementation((options) => {
      options.success?.({
        longitude: 120.1,
        latitude: 30.2,
      } as WechatMiniprogram.GetLocationSuccessCallbackResult);
      return undefined as never;
    });

    await expect(ensureRealLocation(true)).resolves.toMatchObject({
      selectionMode: "REAL_LOCATION",
      longitude: 120.1,
      latitude: 30.2,
    });
    expect(cityStore.getState()).toMatchObject({
      locationStatus: "READY",
      longitude: 120.1,
      latitude: 30.2,
    });
  });

  it("distinguishes denied authorization and clears coordinates", async () => {
    cityStore.setLocation("READY", { longitude: 120.1, latitude: 30.2 });
    vi.mocked(wx.getLocation).mockImplementation((options) => {
      options.fail?.({ errMsg: "getLocation:fail auth deny" });
      return undefined as never;
    });

    await expect(ensureRealLocation(true)).rejects.toMatchObject({
      errMsg: "getLocation:fail auth deny",
    });
    expect(cityStore.getState()).toEqual({
      selectedCity: { code: "330100", name: "杭州" },
      locationStatus: "DENIED",
      selectionMode: "DEFAULT_CITY",
    });
  });

  it("treats timeout and device failures as a recoverable location failure", async () => {
    vi.mocked(wx.getLocation).mockImplementation((options) => {
      options.fail?.({ errMsg: "getLocation:fail timeout" });
      return undefined as never;
    });

    await expect(ensureRealLocation(true)).rejects.toBeDefined();
    expect(cityStore.getState().locationStatus).toBe("FAILED");
  });

  it("discards a late result after the selected city changes", async () => {
    let success: WechatMiniprogram.GetLocationOption["success"] | undefined;
    vi.mocked(wx.getLocation).mockImplementation((options) => {
      success = options.success;
      return undefined as never;
    });

    const locating = ensureRealLocation(true);
    cityStore.select({ code: "310100", name: "上海" });
    success?.({
      longitude: 120.1,
      latitude: 30.2,
    } as WechatMiniprogram.GetLocationSuccessCallbackResult);

    await expect(locating).rejects.toBeDefined();
    expect(cityStore.getState()).toEqual({
      selectedCity: { code: "310100", name: "上海" },
      locationStatus: "IDLE",
      selectionMode: "MANUAL_CITY",
    });
  });
});
