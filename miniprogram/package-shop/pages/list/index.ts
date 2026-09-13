import {
  ensureDiscoveryContext,
  loadAvailableCities,
  locateForNearby,
  locationFailureMessage,
  syncCityPreference,
} from "../../../services/city";
import { listShopTypes, loadShopPage } from "../../../services/shop";
import { cityStore } from "../../../store/city";
import type { Shop, ShopSort, ShopType } from "../../../types";
import { shopDetailUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";
import { syncTabBar } from "../../../utils/navigation";

const PAGE_SIZE = 10;

Page({
  data: {
    title: "发现好店",
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
    selectedCity: null as { code: string; name: string } | null,
    cityPickerVisible: false,
    cityLoading: false,
    cities: [] as Array<{ code: string; name: string }>,
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
  onShow() {
    syncTabBar(this);
    const selectedCity = cityStore.getState().selectedCity;
    const selectionMode = cityStore.getState().selectionMode;
    if (
      this.initialized &&
      selectedCity &&
      `${selectionMode}:${selectedCity.code}` !== this.locationKey
    ) {
      this.cityCode = selectedCity.code;
      this.locationKey = `${selectionMode}:${selectedCity.code}`;
      if (selectionMode !== "REAL_LOCATION" && this.data.sort === "DISTANCE") {
        this.setData({ sort: "POPULAR" });
      }
      this.setData({ selectedCity });
      void this.loadShops(true);
    }
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
      this.scope?.run(ensureDiscoveryContext()),
      this.scope?.run(listShopTypes()),
    ]);
    if (cityResult.status !== "fulfilled" || !cityResult.value) {
      this.setData({
        loading: false,
        error: locationFailureMessage(
          cityResult.status === "rejected" ? cityResult.reason : undefined,
        ),
      });
      return;
    }
    const city = cityResult.value;
    this.cityCode = city.code;
    this.locationKey = `${city.selectionMode || "DEFAULT_CITY"}:${city.code}`;
    this.setData({
      selectedCity: { code: city.code, name: city.name },
      types:
        typeResult.status === "fulfilled" && typeResult.value
          ? typeResult.value.data || []
          : [],
      loading: false,
    });
    this.initialized = true;
    await this.loadShops(true);
  },
  async loadShops(reset: boolean) {
    if (!this.cityCode || (!reset && this.data.loading)) return;
    const sequence = reset ? ++this.requestSequence : this.requestSequence;
    const page = reset ? 1 : this.data.page;
    const location = cityStore.getState();
    const coordinates =
      location.selectionMode === "REAL_LOCATION"
        ? { longitude: location.longitude, latitude: location.latitude }
        : {};
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
          ...coordinates,
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
      if (cityStore.getState().selectionMode !== "REAL_LOCATION") {
        wx.showToast({ title: "恢复定位后可使用距离排序", icon: "none" });
        return;
      }
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
  async openCityPicker() {
    if (this.data.cityLoading) return;
    this.setData({ cityLoading: true });
    try {
      const cities = await this.scope?.run(loadAvailableCities());
      if (cities) {
        const location = cityStore.getState();
        this.setData({
          cities: cities.map((city) => ({
            ...city,
            isCurrentLocation:
              location.selectionMode === "REAL_LOCATION" &&
              location.selectedCity?.code === city.code,
          })),
          cityPickerVisible: true,
        });
      }
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "城市列表加载失败",
        icon: "none",
      });
    } finally {
      this.setData({ cityLoading: false });
    }
  },
  closeCityPicker() {
    this.setData({ cityPickerVisible: false });
  },
  noop() {},
  selectCity(event: WechatMiniprogram.TouchEvent) {
    const code = String(event.currentTarget.dataset.code || "");
    const city = this.data.cities.find((item) => item.code === code);
    if (!city) return;
    const currentLocation = cityStore.getState();
    // 再次选择当前真实定位城市时保持 REAL_LOCATION，继续支持距离能力。
    if (
      currentLocation.selectionMode === "REAL_LOCATION" &&
      currentLocation.selectedCity?.code === city.code
    ) {
      this.setData({ cityPickerVisible: false });
      return;
    }
    cityStore.select(city);
    syncCityPreference(city.code);
    this.cityCode = city.code;
    this.locationKey = `${cityStore.getState().selectionMode}:${city.code}`;
    this.setData({
      selectedCity: city,
      cityPickerVisible: false,
      ...(this.data.sort === "DISTANCE" ? { sort: "POPULAR" } : {}),
    });
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
  initialized: false,
  locationKey: "",
  requestSequence: 0,
  searchTimer: undefined as ReturnType<typeof setTimeout> | undefined,
});

function mergeShops(current: Shop[], incoming: Shop[]): Shop[] {
  const shops = new Map(current.map((shop) => [shop.id, shop]));
  incoming.forEach((shop) => shops.set(shop.id, shop));
  return [...shops.values()];
}
