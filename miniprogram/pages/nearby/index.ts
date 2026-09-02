import { ensureSelectedCity, locateForNearby } from "../../services/city";
import { listShopTypes, loadShopPage } from "../../services/shop";
import { cityStore } from "../../store/city";
import type { Shop, ShopSort, ShopType } from "../../types";
import { syncTabBar } from "../../utils/navigation";
import { shopDetailUrl } from "../../utils/routes";
import { createRequestScope } from "../../utils/scope";

const PAGE_SIZE = 10;

Page({
  data: {
    cityName: "",
    keyword: "",
    typeId: "",
    sort: "POPULAR" as ShopSort,
    types: [] as ShopType[],
    shops: [] as Shop[],
    page: 1,
    hasMore: true,
    loading: true,
    refreshing: false,
    error: "",
    locationStatus: "IDLE",
    locationHint: "定位后可按距离查找",
  },
  onLoad() {
    this.scope = createRequestScope();
    void this.initialize();
  },
  onShow() {
    syncTabBar(this);
    const selectedCity = cityStore.getState().selectedCity;
    if (
      this.initialized &&
      selectedCity &&
      selectedCity.code !== this.cityCode
    ) {
      this.cityCode = selectedCity.code;
      this.setData({ cityName: selectedCity.name });
      void this.loadShops(true);
    }
  },
  onUnload() {
    this.scope?.close();
    if (this.searchTimer) clearTimeout(this.searchTimer);
  },
  onPullDownRefresh() {
    void this.refresh();
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
    const types =
      typeResult.status === "fulfilled" && typeResult.value
        ? typeResult.value.data || []
        : [];
    this.cityCode = city.code;
    this.initialized = true;
    this.setData({
      cityName: city.name,
      types,
      loading: false,
      error: "",
    });
    await this.loadShops(true);
    void this.resolveLocation(false);
  },
  async refresh() {
    this.setData({ refreshing: true });
    try {
      await this.loadShops(true);
    } finally {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }
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
        error: this.errorMessage(error),
      });
    } finally {
      if (sequence === this.requestSequence) this.setData({ loading: false });
    }
  },
  onKeyword(event: WechatMiniprogram.CustomEvent) {
    const detail = event.detail as unknown as string | { value: string };
    const keyword = typeof detail === "string" ? detail : detail.value;
    this.setData({ keyword });
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
      const located = await this.resolveLocation(true);
      if (!located) {
        this.setData({ sort: "POPULAR" });
        return;
      }
    }
    this.setData({ sort });
    await this.loadShops(true);
  },
  async resolveLocation(showFailure: boolean): Promise<boolean> {
    if (this.locationPromise) return this.locationPromise;
    const current = cityStore.getState();
    if (
      current.locationStatus === "READY" &&
      current.longitude !== undefined &&
      current.latitude !== undefined
    ) {
      this.setData({
        locationStatus: "READY",
        locationHint: "已定位，可按距离查找",
      });
      return true;
    }

    this.setData({
      locationStatus: "LOCATING",
      locationHint: "正在获取位置…",
    });
    this.locationPromise = locateForNearby().then((result) => {
      const ready = result.status === "READY";
      this.setData({
        locationStatus: result.status,
        locationHint: ready
          ? "已定位，可按距离查找"
          : result.status === "DENIED"
            ? "未授权定位，已使用综合排序"
            : "定位失败，已使用综合排序",
      });
      if (!ready && showFailure) {
        wx.showToast({
          title:
            result.status === "DENIED"
              ? "请在设置中开启定位权限"
              : "定位失败，已切换综合排序",
          icon: "none",
        });
      }
      return ready;
    });
    try {
      return await this.locationPromise;
    } finally {
      this.locationPromise = undefined;
    }
  },
  retryLocation() {
    void this.resolveLocation(true);
  },
  retry() {
    if (!this.initialized) void this.initialize();
    else void this.loadShops(true);
  },
  openShop(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: shopDetailUrl(event.detail.id) });
  },
  openShopList() {
    const query = this.data.typeId
      ? `?typeId=${encodeURIComponent(this.data.typeId)}`
      : "";
    wx.navigateTo({ url: `/package-shop/pages/list/index${query}` });
  },
  errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "商户暂时加载失败";
  },
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
  cityCode: "",
  initialized: false,
  requestSequence: 0,
  searchTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  locationPromise: undefined as Promise<boolean> | undefined,
});

function mergeShops(current: Shop[], incoming: Shop[]): Shop[] {
  const shops = new Map(current.map((shop) => [shop.id, shop]));
  incoming.forEach((shop) => shops.set(shop.id, shop));
  return [...shops.values()];
}
