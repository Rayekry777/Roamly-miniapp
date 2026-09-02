import { beforeEach, describe, expect, it, vi } from "vitest";
import { listShopsByType } from "../miniprogram/api/shop";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("../miniprogram/utils/request", () => ({ request: requestMock }));

describe("shop requests", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      code: "OK",
      message: "操作成功",
      data: { items: [], page: 1, size: 10, total: 0 },
    });
  });

  it("定位不可用时省略经纬度参数", async () => {
    await listShopsByType({ typeId: "1", current: 1 });

    expect(requestMock).toHaveBeenCalledWith("/v1/shops", {
      data: { typeId: "1", page: 1, size: 10 },
      auth: "public",
    });
  });

  it("经纬度完整有效时同时发送", async () => {
    await listShopsByType({ typeId: "2", current: 2, x: 120.123, y: 30.456 });

    expect(requestMock).toHaveBeenCalledWith("/v1/shops", {
      data: {
        typeId: "2",
        page: 2,
        size: 10,
        longitude: 120.123,
        latitude: 30.456,
      },
      auth: "public",
    });
  });
});
