import {
  ensureDiscoveryContext,
  locationFailureMessage,
} from "../../../services/city";
import { listShopTypeTree, loadShopPage } from "../../../services/shop";
import { cityStore } from "../../../store/city";
import type { Shop, ShopSort, ShopType } from "../../../types";
import { shopDetailUrl } from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";
import { syncTabBar } from "../../../utils/navigation";

import { discoveryState } from "../../../store/shop-discovery";
import { voucherProductUrl } from "../../../utils/routes";
const PAGE_SIZE = 10;
function locationFingerprint() {
  const state = cityStore.getState();
  return `${state.selectionMode}:${state.selectedCity?.code}:${state.longitude ?? ""}:${state.latitude ?? ""}`;
}

Page({
  data: {
    title: "发现好店",
    categoryId: "",
    productId: "",
    categoriesExpanded: false,
    keyword: "",
    types: [] as ShopType[],
    shops: [] as Shop[],
    typeId: "",
    sort: "RECOMMENDED" as ShopSort,
    sortOptions: [
      { value: "RECOMMENDED", label: "综合推荐" },
      { value: "SALES", label: "销量" },
      { value: "DISTANCE", label: "离我最近" },
      { value: "SCORE", label: "评分" },
    ] as Array<{ value: ShopSort; label: string }>,
    page: 1,
    loading: true,
    hasMore: true,
    error: "",
  },
  onLoad(options) {
    this.scope = createRequestScope();
    const categoryId = String(options.categoryId || "");
    if (!options.productId && categoryId !== "1" && categoryId !== "2") {
      wx.switchTab({ url: "/pages/nearby/index" });
      return;
    }
    this.setData({
      categoryId,
      productId: String(options.productId || ""),
      title: options.productId
        ? "适用门店"
        : categoryId === "1"
          ? "美食"
          : "休闲娱乐",
    });
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
      locationFingerprint() !== this.locationKey
    ) {
      this.cityCode = selectedCity.code;
      this.locationKey = locationFingerprint();
      if (selectionMode !== "REAL_LOCATION" && this.data.sort === "DISTANCE") {
        this.setData({ sort: "RECOMMENDED" });
      }
      void this.loadShops(true);
    } else if (this.initialized) {
      void this.refreshVisible();
    }
  },
  onHide() {
    this.saveSnapshot();
  },
  saveSnapshot() {
    if (!this.data.categoryId) return;
    discoveryState.save(this.data.categoryId, {
      locationKey: this.locationKey,
      keyword: this.data.keyword,
      typeId: this.data.typeId,
      sort: this.data.sort,
      shops: this.data.loading ? [] : this.data.shops,
      page: this.data.loading ? 1 : this.data.page,
      hasMore: this.data.hasMore,
      scrollTop: this.scrollTop,
    });
  },
  onPageScroll(event: WechatMiniprogram.Page.IPageScrollOption) {
    this.scrollTop = event.scrollTop;
  },
  toggleCategories() {
    this.setData({ categoriesExpanded: !this.data.categoriesExpanded });
  },
  openVoucher(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: voucherProductUrl(event.detail.id) });
  },
  async refreshVisible() {
    if (!this.cityCode || this.data.loading) return;
    const sequence = ++this.requestSequence;
    const state = cityStore.getState();
    const pages = Math.max(1, this.data.page - 1);
    this.setData({ loading: true });
    try {
      const results = await Promise.all(
        Array.from({ length: pages }, (_, index) =>
          loadShopPage({
            cityCode: this.cityCode,
            categoryId: this.data.categoryId || undefined,
            productId: this.productId || undefined,
            typeId: this.data.typeId || undefined,
            keyword: this.data.keyword,
            sort: this.productId ? "POPULAR" : this.data.sort,
            page: index + 1,
            size: PAGE_SIZE,
            ...(state.selectionMode === "REAL_LOCATION"
              ? { longitude: state.longitude, latitude: state.latitude }
              : {}),
          }),
        ),
      );
      if (sequence !== this.requestSequence) return;
      const shops = mergeShops(
        [],
        results.flatMap((result) => result.items),
      );
      this.setData({
        shops,
        hasMore: shops.length < (results[0]?.total || 0),
        error: "",
      });
    } catch (error) {
      if (sequence === this.requestSequence)
        this.setData({
          error: error instanceof Error ? error.message : "刷新失败",
        });
    } finally {
      if (sequence === this.requestSequence) this.setData({ loading: false });
    }
  },
  onUnload() {
    this.saveSnapshot();
    ++this.requestSequence;
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
      this.scope?.run(listShopTypeTree()),
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
    if (
      !this.productId &&
      (typeResult.status !== "fulfilled" || !typeResult.value)
    ) {
      this.setData({ loading: false, error: "分类加载失败，请重试" });
      return;
    }
    this.cityCode = city.code;
    this.locationKey = locationFingerprint();
    this.setData({
      types:
        typeResult.status === "fulfilled" && typeResult.value
          ? typeResult.value.data?.find(
              (type) => type.id === this.data.categoryId,
            )?.children || []
          : [],
      loading: false,
    });
    this.initialized = true;
    const cached = discoveryState.read(this.data.categoryId, this.locationKey);
    if (cached) {
      this.scrollTop = cached.scrollTop;
      this.setData({
        keyword: cached.keyword,
        typeId: cached.typeId,
        sort: cached.sort,
        shops: cached.shops,
        page: cached.page,
        hasMore: cached.hasMore,
      });
      await this.refreshVisible();
      wx.pageScrollTo({ scrollTop: cached.scrollTop, duration: 0 });
    } else {
      await this.loadShops(true);
    }
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
          categoryId: this.data.categoryId || undefined,
          productId: this.productId || undefined,
          typeId: this.data.typeId || undefined,
          keyword: this.data.keyword,
          sort: this.productId ? "POPULAR" : this.data.sort,
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
    ++this.requestSequence;
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
    const location = cityStore.getState();
    if (
      sort === "DISTANCE" &&
      (location.selectionMode !== "REAL_LOCATION" ||
        location.locationStatus !== "READY" ||
        location.longitude === undefined ||
        location.latitude === undefined)
    ) {
      wx.showToast({ title: "请先在首页开启定位", icon: "none" });
      return;
    }
    this.setData({ sort });
    await this.loadShops(true);
  },
  retry() {
    if (!this.initialized) void this.initialize();
    else void this.loadShops(true);
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
  scrollTop: 0,
  searchTimer: undefined as ReturnType<typeof setTimeout> | undefined,
});

function mergeShops(current: Shop[], incoming: Shop[]): Shop[] {
  const shops = new Map(current.map((shop) => [shop.id, shop]));
  incoming.forEach((shop) => shops.set(shop.id, shop));
  return [...shops.values()];
}
