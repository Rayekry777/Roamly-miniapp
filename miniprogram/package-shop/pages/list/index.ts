import { ensureSelectedCity, locateForNearby } from "../../../services/city";
import { listShopTypes, loadShopPage } from "../../../services/shop";
import { cityStore } from "../../../store/city";
import type { Shop, ShopSort, ShopType } from "../../../types";
import { shopDetailUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";

const PAGE_SIZE = 10;

Page({
  data: {
    title: "发现好店",
    cityName: "",
    keyword: "",
    types: [] as ShopType[],
    shops: [] as Shop[],
    typeId: "",
    sort: "POPULAR" as ShopSort,
    sortOptions: [
      { value: "POPULAR", label: "热门" },
      { value: "DISTANCE", label: "距离" },
      { value: "SCORE", label: "评分" },
    ] as Array<{ value: ShopSort; label: string }>,
    page: 1,
    loading: true,
    hasMore: true,
    error: "",
  },
  onLoad(options) {
    this.scope = createRequestScope();
    this.setData({
      typeId: options.typeId || "",
      keyword: options.keyword ? decodeURIComponent(options.keyword) : "",
    });
    this.productId = String(options.productId || "");
    void this.initialize();
  },
  onUnload() {
    this.scope?.close();
    if (this.searchTimer) clearTimeout(this.searchTimer);
  },
  onPullDownRefresh() {
    void this.loadShops(true).finally(() => wx.stopPullDownRefresh());
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) void this.loadShops(false);
  },
  async initialize() {
    const [cityResult, typeResult] = await Promise.allSettled([
      this.scope?.run(ensureSelectedCity()),
      this.scope?.run(listShopTypes()),
    ]);
    if (cityResult.status !== "fulfilled" || !cityResult.value) {
      this.setData({
        loading: false,
        error: "当前暂无可用城市，请稍后重试",
      });
      return;
    }
    const city = cityResult.value;
    this.cityCode = city.code;
    this.setData({
      cityName: city.name,
      types:
        typeResult.status === "fulfilled" && typeResult.value
          ? typeResult.value.data || []
          : [],
      loading: false,
    });
    await this.loadShops(true);
  },
  async loadShops(reset: boolean) {
    if (!this.cityCode || (!reset && this.data.loading)) return;
    const sequence = reset ? ++this.requestSequence : this.requestSequence;
    const page = reset ? 1 : this.data.page;
    const location = cityStore.getState();
    this.setData({ loading: true, error: reset ? "" : this.data.error });
    try {
      const result = await this.scope?.run(
        loadShopPage({
          cityCode: this.cityCode,
          productId: this.productId || undefined,
          typeId: this.data.typeId || undefined,
          keyword: this.data.keyword,
          sort: this.data.sort,
          page,
          size: PAGE_SIZE,
          longitude: location.longitude,
          latitude: location.latitude,
        }),
      );
      if (!result || sequence !== this.requestSequence) return;
      const items = reset
        ? result.items
        : mergeShops(this.data.shops, result.items);
      this.setData({
        shops: items,
        page: page + 1,
        hasMore: items.length < result.total && result.items.length > 0,
        error: "",
      });
    } catch (error) {
      if (sequence !== this.requestSequence) return;
      this.setData({
        ...(reset ? { shops: [], page: 1, hasMore: true } : {}),
        error: error instanceof Error ? error.message : "商户暂时加载失败",
      });
    } finally {
      if (sequence === this.requestSequence) this.setData({ loading: false });
    }
  },
  onKeyword(event: WechatMiniprogram.CustomEvent) {
    const detail = event.detail as unknown as string | { value: string };
    this.setData({
      keyword: typeof detail === "string" ? detail : detail.value,
    });
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadShops(true), 350);
  },
  search() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    void this.loadShops(true);
  },
  selectType(event: WechatMiniprogram.TouchEvent) {
    const typeId = String(event.currentTarget.dataset.id || "");
    if (typeId === this.data.typeId) return;
    this.setData({ typeId });
    void this.loadShops(true);
  },
  async selectSort(event: WechatMiniprogram.TouchEvent) {
    const sort = String(event.currentTarget.dataset.sort) as ShopSort;
    if (sort === this.data.sort) return;
    if (sort === "DISTANCE") {
      const location = cityStore.getState();
      const ready =
        location.locationStatus === "READY" &&
        location.longitude !== undefined &&
        location.latitude !== undefined;
      const result = ready
        ? { status: "READY" as const }
        : await locateForNearby();
      if (result.status !== "READY") {
        this.setData({ sort: "POPULAR" });
        wx.showToast({
          title:
            result.status === "DENIED"
              ? "请在设置中开启定位权限"
              : "定位失败，已切换综合排序",
          icon: "none",
        });
        return;
      }
    }
    this.setData({ sort });
    await this.loadShops(true);
  },
  retry() {
    void this.loadShops(true);
  },
  openShop(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: shopDetailUrl(event.detail.id) });
  },
  navigateShop(
    event: WechatMiniprogram.CustomEvent<{
      latitude: number;
      longitude: number;
      name: string;
      address: string;
    }>,
  ) {
    const { latitude, longitude, name, address } = event.detail;
    wx.openLocation({ latitude, longitude, name, address });
  },
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
  cityCode: "",
  productId: "",
  requestSequence: 0,
  searchTimer: undefined as ReturnType<typeof setTimeout> | undefined,
});

function mergeShops(current: Shop[], incoming: Shop[]): Shop[] {
  const shops = new Map(current.map((shop) => [shop.id, shop]));
  incoming.forEach((shop) => shops.set(shop.id, shop));
  return [...shops.values()];
}
