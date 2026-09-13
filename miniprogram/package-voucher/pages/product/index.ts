import {
  listVoucherProducts,
  loadVoucherProduct,
} from "../../../services/voucher-product";
import type {
  ShopSummary,
  VoucherProduct,
  VoucherProductListItem,
} from "../../../types";
import { requireLogin } from "../../../utils/navigation";
import {
  shopDetailUrl,
  shopListUrl,
  orderResultUrl,
  voucherNoticeUrl,
} from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";
import { confirmOrder, createOrder } from "../../../services/order";
import { openVoucherPayment } from "../../../services/payment-flow";

Page({
  data: {
    product: null as VoucherProduct | null,
    shop: null as ShopSummary | null,
    related: [] as VoucherProductListItem[],
    loading: true,
    error: "",
    confirmOpen: false,
    confirmLoading: false,
    confirmError: "",
    confirmErrorTitle: "",
    confirmation: null as
      | import("../../../types").VoucherOrderConfirmation
      | null,
    confirmQuantity: 1,
    confirmExpandedSection: "" as "promotion" | "payment" | "",
    confirmSubmitting: false,
  },
  onLoad(options) {
    this.productId = String(options.id || options.productId || "");
    this.scope = createRequestScope();
    if (!this.productId) {
      this.setData({ loading: false, error: "缺少团购商品 ID" });
      return;
    }
    void this.loadProduct();
  },
  onUnload() {
    this.scope?.close();
  },
  async loadProduct() {
    this.setData({ loading: true, error: "" });
    try {
      const detail = await this.scope?.run(loadVoucherProduct(this.productId));
      if (!detail) return;
      this.setData({
        product: detail.product,
        shop: detail.shop,
        loading: false,
      });
      void this.loadRelated(detail.shop, detail.product.id);
    } catch (error) {
      this.setData({
        product: null,
        shop: null,
        related: [],
        loading: false,
        error: error instanceof Error ? error.message : "团购商品暂时加载失败",
      });
    }
  },
  async loadRelated(shop: ShopSummary, currentId: string) {
    try {
      const products = await this.scope?.run(listVoucherProducts(shop.id));
      if (!products) return;
      this.setData({
        related: products
          .filter((product) => product.id !== currentId)
          .slice(0, 4)
          .map((product) => ({
            product,
            shop,
            distanceText: "",
            itemKey: product.id,
          })),
      });
    } catch {
      this.setData({ related: [] });
    }
  },
  openConfirm() {
    const product = this.data.product;
    if (!product || product.status !== "ON_SALE") return;
    if (!requireLogin()) return;
    this.setData({
      confirmOpen: true,
      confirmLoading: true,
      confirmError: "",
      confirmErrorTitle: "",
      confirmation: null,
      confirmQuantity: 1,
      confirmExpandedSection: "",
    });
    void this.refreshConfirmation(1);
  },
  closeConfirm() {
    if (this.data.confirmSubmitting) return;
    this.setData({ confirmOpen: false });
  },
  noop() {},
  async refreshConfirmation(quantity: number) {
    this.setData({ confirmLoading: true, confirmError: "" });
    try {
      const confirmation = await this.scope?.run(
        confirmOrder(this.productId, quantity),
      );
      if (!confirmation) return;
      this.setData({
        confirmation,
        confirmQuantity: confirmation.quantity,
        confirmErrorTitle: "",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "订单确认失败";
      this.setData({
        confirmation: null,
        confirmError: message,
        confirmErrorTitle: message.includes("限购")
          ? "超过每人限购数量"
          : message.includes("库存") || message.includes("下架")
            ? "库存不足或商品已下架"
            : "暂时无法确认订单",
      });
    } finally {
      this.setData({ confirmLoading: false });
    }
  },
  toggleConfirmSection(event: WechatMiniprogram.TouchEvent) {
    const section = String(event.currentTarget.dataset.section || "");
    if (!["promotion", "payment"].includes(section)) return;
    this.setData({
      confirmExpandedSection:
        this.data.confirmExpandedSection === section
          ? ""
          : (section as "promotion" | "payment"),
    });
  },
  confirmDecrease() {
    const min = this.data.confirmation?.minQuantity || 1;
    const next = Math.max(min, this.data.confirmQuantity - 1);
    if (next !== this.data.confirmQuantity) void this.refreshConfirmation(next);
  },
  confirmIncrease() {
    const max = this.data.confirmation?.maxQuantity || 1;
    const next = Math.min(max, this.data.confirmQuantity + 1);
    if (next !== this.data.confirmQuantity) void this.refreshConfirmation(next);
  },
  async submitConfirmation() {
    if (
      this.data.confirmSubmitting ||
      this.data.confirmLoading ||
      !this.data.confirmation
    )
      return;
    this.setData({ confirmSubmitting: true, confirmError: "" });
    try {
      const order = await createOrder(
        this.productId,
        this.data.confirmQuantity,
      );
      let paymentOutcome: "FAILED" | "CANCELLED" | "UNAVAILABLE" | "SUCCESS" =
        "SUCCESS";
      try {
        const payment = await openVoucherPayment(order.id);
        paymentOutcome = payment.outcome;
      } catch (paymentError) {
        paymentOutcome = "UNAVAILABLE";
        wx.showToast({
          title:
            paymentError instanceof Error
              ? paymentError.message
              : "支付未完成，订单已保存",
          icon: "none",
        });
      }
      wx.redirectTo({ url: orderResultUrl(order.id, paymentOutcome) });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "订单创建失败，请重新确认";
      this.setData({
        confirmError: message,
        confirmErrorTitle: "订单提交失败",
      });
      await this.refreshConfirmation(this.data.confirmQuantity);
    } finally {
      this.setData({ confirmSubmitting: false });
    }
  },
  retry() {
    void this.loadProduct();
  },
  openShop() {
    if (!this.data.shop?.id) return;
    wx.navigateTo({
      url: shopDetailUrl(this.data.shop.id),
      fail: () =>
        wx.showToast({ title: "门店页打开失败，请重试", icon: "none" }),
    });
  },
  openShopList() {
    if (!this.data.product?.id) return;
    wx.navigateTo({
      url: shopListUrl({ productId: this.data.product.id }),
      fail: () =>
        wx.showToast({ title: "适用门店打开失败，请重试", icon: "none" }),
    });
  },
  openNotice() {
    if (!this.data.product?.id) return;
    wx.navigateTo({
      url: voucherNoticeUrl(this.data.product.id),
      fail: () =>
        wx.showToast({ title: "购买须知打开失败，请重试", icon: "none" }),
    });
  },
  openRelated(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (!id) return;
    wx.navigateTo({
      url: `/package-voucher/pages/product/index?id=${encodeURIComponent(id)}`,
      fail: () =>
        wx.showToast({ title: "商品详情打开失败，请重试", icon: "none" }),
    });
  },
  productId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
