import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  discoverShops,
  getShop,
  listShopPosts,
  listShops,
} from "../miniprogram/api/shop";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("../miniprogram/utils/request", () => ({ request: requestMock }));

describe("shop requests", () => {
  it("omits absent discovery filters instead of serializing undefined", async () => {
    await discoverShops({
      cityCode: "330100",
      categoryId: "1",
      sort: "RECOMMENDED",
      typeId: undefined,
      keyword: "  ",
      longitude: undefined,
      latitude: undefined,
    });
    expect(requestMock).toHaveBeenCalledWith("/v1/shops/discovery", {
      data: {
        cityCode: "330100",
        categoryId: "1",
        sort: "RECOMMENDED",
        page: 1,
        size: 10,
      },
      auth: "public",
      showError: false,
    });
  });
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      code: "OK",
      message: "操作成功",
      data: { items: [], page: 1, size: 10, total: 0 },
    });
  });

  it("omits coordinates when location is unavailable", async () => {
    await listShops({
      cityCode: "330100",
      typeId: "1",
      sort: "POPULAR",
    });

    expect(requestMock).toHaveBeenCalledWith("/v1/shops", {
      data: {
        cityCode: "330100",
        sort: "POPULAR",
        typeId: "1",
        page: 1,
        size: 10,
      },
      auth: "public",
      showError: false,
    });
  });

  it("sends valid coordinates as a pair", async () => {
    await listShops({
      cityCode: "330100",
      typeId: "2",
      sort: "DISTANCE",
      page: 2,
      longitude: 120.123,
      latitude: 30.456,
    });

    expect(requestMock).toHaveBeenCalledWith("/v1/shops", {
      data: {
        cityCode: "330100",
        sort: "DISTANCE",
        typeId: "2",
        page: 2,
        size: 10,
        longitude: 120.123,
        latitude: 30.456,
      },
      auth: "public",
      showError: false,
    });
  });

  it("omits incomplete or invalid coordinates", async () => {
    await listShops({
      cityCode: "330100",
      sort: "SCORE",
      longitude: 181,
      latitude: 30,
    });

    expect(requestMock).toHaveBeenCalledWith("/v1/shops", {
      data: {
        cityCode: "330100",
        sort: "SCORE",
        page: 1,
        size: 10,
      },
      auth: "public",
      showError: false,
    });
  });

  it("uses optional coordinates for detail and optional auth for related posts", async () => {
    await getShop("9223372036854775807", {
      longitude: 120.1,
      latitude: 30.2,
    });
    await listShopPosts("9223372036854775807");

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      "/v1/shops/9223372036854775807",
      {
        data: { longitude: 120.1, latitude: 30.2 },
        auth: "public",
        showError: false,
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      "/v1/shops/9223372036854775807/posts",
      {
        data: { size: 3 },
        auth: "optional",
        showError: false,
      },
    );
  });
});
