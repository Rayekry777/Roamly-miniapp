import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adaptShop,
  loadShopPage,
  normalizeShopQuery,
} from "../miniprogram/services/shop";

const shopApiMock = vi.hoisted(() => ({
  listShops: vi.fn(),
  listShopTypes: vi.fn(),
  listVouchers: vi.fn(),
  getShop: vi.fn(),
  listShopPosts: vi.fn(),
}));

vi.mock("../miniprogram/api/shop", () => shopApiMock);

describe("shop service", () => {
  beforeEach(() => {
    Object.values(shopApiMock).forEach((mock) => mock.mockReset());
  });

  it("normalizes ids, images, scores and distances for rendering", () => {
    const shop = adaptShop({
      id: "9223372036854775807",
      name: "漫游咖啡",
      typeId: "2",
      images: "/blogs/a.webp,/blogs/b.webp",
      score: 49,
      distance: 1250,
      sold: 10,
      comments: 3,
    });

    expect(shop.id).toBe("9223372036854775807");
    expect(shop.images).toEqual(["/blogs/a.webp", "/blogs/b.webp"]);
    expect(shop.cover).toBe("/blogs/a.webp");
    expect(shop.score).toBe(4.9);
    expect(shop.distanceText).toBe("1.3km");
  });

  it("falls back from distance sorting when coordinates are unavailable", () => {
    expect(
      normalizeShopQuery({
        cityCode: "330100",
        sort: "DISTANCE",
        longitude: 120.1,
      }),
    ).toMatchObject({
      cityCode: "330100",
      sort: "SCORE",
      longitude: undefined,
      latitude: undefined,
    });
  });

  it("adapts a page without changing total-based pagination facts", async () => {
    shopApiMock.listShops.mockResolvedValue({
      code: "OK",
      message: "操作成功",
      data: {
        items: [
          {
            id: "1",
            name: "茶馆",
            typeId: "3",
            images: "",
            score: 45,
          },
        ],
        page: 1,
        size: 10,
        total: 18,
      },
    });

    const result = await loadShopPage({
      cityCode: "330100",
      sort: "POPULAR",
    });

    expect(result.total).toBe(18);
    expect(result.items[0]).toMatchObject({
      id: "1",
      score: 4.5,
      distanceText: "距离待定位",
    });
  });
});
