import { ensureSelectedCity, locateForNearby } from "../../services/city";
import { listShopTypes } from "../../services/shop";
import { loadVoucherProductPage } from "../../services/voucher-product";
import { cityStore } from "../../store/city";
import type {
  ShopType,
  VoucherProductListItem,
  VoucherProductSort,
} from "../../types";
import { syncTabBar } from "../../utils/navigation";
import { voucherProductUrl } from "../../utils/routes";
import { createRequestScope } from "../../utils/scope";
import { categoryIconUrl } from "../../utils/media";

const PAGE_SIZE = 10;

Page({
  data: {
    cityName: "",
    keyword: "",
    typeId: "",
    sort: "RECOMMENDED" as VoucherProductSort,
    types: [] as ShopType[],
    products: [] as VoucherProductListItem[],
    page: 1,
    hasMore: true,
    loading: true,
    refreshing: false,
    error: "",
    locationStatus: "IDLE",
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
      void this.loadProducts(true);
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
    if (this.data.hasMore && !this.data.loading) void this.loadProducts(false);
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
        ? (typeResult.value.data || []).map((type) => ({
            ...type,
            icon: categoryIconUrl(type.icon, type.name),
          }))
        : [];
    this.cityCode = city.code;
    this.initialized = true;
    this.setData({
      cityName: city.name,
      types,
      loading: false,
      error: "",
    });
    await this.loadProducts(true);
    void this.resolveLocation(false);
  },
  async refresh() {
    this.setData({ refreshing: true });
    try {
      await this.loadProducts(true);
    } finally {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }
  },
  async loadProducts(reset: boolean) {
    if (!this.cityCode || (!reset && this.data.loading)) return;
    const sequence = reset ? ++this.requestSequence : this.requestSequence;
    const page = reset ? 1 : this.data.page;
    const location = cityStore.getState();
    this.setData({ loading: true, error: reset ? "" : this.data.error });

    try {
      const result = await this.scope?.run(
        loadVoucherProductPage({
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
        : mergeProducts(this.data.products, result.items);
      this.setData({
        products: items,
        page: page + 1,
        hasMore: items.length < result.total && result.items.length > 0,
        error: "",
      });
    } catch (error) {
      if (sequence !== this.requestSequence) return;
      this.setData({
        ...(reset ? { products: [], page: 1, hasMore: true } : {}),
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
    this.searchTimer = setTimeout(() => void this.loadProducts(true), 350);
  },
  search() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    void this.loadProducts(true);
  },
  selectType(event: WechatMiniprogram.TouchEvent) {
    const typeId = String(event.currentTarget.dataset.id || "");
    if (typeId === this.data.typeId) return;
    this.setData({ typeId });
    void this.loadProducts(true);
  },
  async selectSort(event: WechatMiniprogram.TouchEvent) {
    const sort = String(event.currentTarget.dataset.sort) as VoucherProductSort;
    if (sort === this.data.sort) return;
    if (sort === "DISTANCE") {
      const located = await this.resolveLocation(true);
      if (!located) {
        this.setData({ sort: "RECOMMENDED" });
        await this.loadProducts(true);
        return;
      }
    }
    this.setData({ sort });
    await this.loadProducts(true);
  },
  async resolveLocation(showFailure: boolean): Promise<boolean> {
    if (this.locationPromise) return this.locationPromise;
    const current = cityStore.getState();
    if (
      current.locationStatus === "READY" &&
      current.longitude !== undefined &&
      current.latitude !== undefined
    ) {
      this.setData({ locationStatus: "READY" });
      return true;
    }

    this.setData({ locationStatus: "LOCATING" });
    this.locationPromise = locateForNearby().then((result) => {
      const ready = result.status === "READY";
      this.setData({ locationStatus: result.status });
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
    else void this.loadProducts(true);
  },
  openProduct(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({
      url: voucherProductUrl(event.detail.id),
      fail: () =>
        wx.showToast({ title: "商品详情打开失败，请重试", icon: "none" }),
    });
  },
  errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "商品暂时加载失败";
  },
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
  cityCode: "",
  initialized: false,
  requestSequence: 0,
  searchTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  locationPromise: undefined as Promise<boolean> | undefined,
});

function mergeProducts(
  current: VoucherProductListItem[],
  incoming: VoucherProductListItem[],
): VoucherProductListItem[] {
  const products = new Map(current.map((item) => [item.product.id, item]));
  incoming.forEach((item) => products.set(item.product.id, item));
  return [...products.values()];
}
