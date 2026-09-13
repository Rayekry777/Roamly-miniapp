import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadShopPage } from "../miniprogram/services/shop";
import { discoveryState } from "../miniprogram/store/shop-discovery";
const api = vi.hoisted(() => ({
  listShopTypes: vi.fn(),
  listShopTypeTree: vi.fn(),
  discoverShops: vi.fn(),
  listShops: vi.fn(),
}));
vi.mock("../miniprogram/api/shop", () => api);
describe("category discovery", () => {
  beforeEach(() => vi.clearAllMocks());
  it("uses a shop page, preserves empty vouchers and formats card total price", async () => {
    api.discoverShops.mockResolvedValue({
      data: {
        page: 1,
        size: 10,
        total: 2,
        items: [
          {
            shop: {
              id: "9007199254740993",
              name: "次卡店",
              typeId: "3",
              images: "",
              score: 45,
              comments: 5,
            },
            categoryId: "2",
            typeName: "运动户外",
            soldCount: 30,
            availableVoucherCount: 3,
            vouchers: [
              {
                id: "9007199254740995",
                title: "十次卡",
                productType: "MULTI_USE",
                payAmount: 10000,
                originalAmount: 20000,
                totalUseCount: 10,
                soldCount: 30,
              },
            ],
          },
          {
            shop: { id: "2", name: "无券店", typeId: "3", images: "" },
            categoryId: "2",
            typeName: "运动户外",
            soldCount: 0,
            availableVoucherCount: 0,
            vouchers: [],
          },
        ],
      },
    });
    const page = await loadShopPage({
      cityCode: "330100",
      categoryId: "2",
      sort: "RECOMMENDED",
    });
    expect(api.listShops).not.toHaveBeenCalled();
    expect(page.total).toBe(2);
    expect(page.items[0]?.id).toBe("9007199254740993");
    expect(page.items[0]?.vouchers?.[0]).toMatchObject({
      priceText: "100",
      originalText: "200",
      typeLabel: "10次卡 · 总价",
    });
    expect(page.items[1]?.vouchers).toEqual([]);
  });
  it("retains the product ownership filter on applicable-shop queries", async () => {
    api.listShops.mockResolvedValue({
      data: { items: [], total: 0, page: 1, size: 10 },
    });
    await loadShopPage({
      cityCode: "330100",
      productId: "8",
      categoryId: "1",
      sort: "POPULAR",
    });
    expect(api.discoverShops).not.toHaveBeenCalled();
    expect(api.listShops.mock.calls[0]?.[0].productId).toBe("8");
  });
  it("isolates category state and invalidates old location snapshots", () => {
    const snapshot = {
      locationKey: "REAL:city:1:2",
      keyword: "咖啡",
      typeId: "104",
      sort: "RECOMMENDED" as const,
      shops: [],
      page: 3,
      hasMore: true,
      scrollTop: 900,
    };
    discoveryState.save("1", snapshot);
    discoveryState.save("2", {
      ...snapshot,
      keyword: "桌游",
      typeId: "203",
      page: 1,
    });
    expect(discoveryState.read("1", snapshot.locationKey)?.keyword).toBe(
      "咖啡",
    );
    expect(discoveryState.read("2", snapshot.locationKey)?.keyword).toBe(
      "桌游",
    );
    expect(discoveryState.read("1", "MANUAL:city")).toBeUndefined();
  });
});
