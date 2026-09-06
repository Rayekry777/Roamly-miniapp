import { loadVoucherProduct } from "../../../services/voucher-product";
import type { VoucherProduct } from "../../../types";
import { createRequestScope } from "../../../utils/scope";

Page({
  data: {
    product: null as VoucherProduct | null,
    loading: true,
    error: "",
  },
  onLoad(options) {
    this.productId = String(options.id || options.productId || "");
    this.scope = createRequestScope();
    void this.loadPage();
  },
  onUnload() {
    this.scope?.close();
  },
  async loadPage() {
    if (!this.productId) {
      this.setData({ loading: false, error: "缺少团购商品 ID" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const detail = await this.scope?.run(loadVoucherProduct(this.productId));
      if (detail) this.setData({ product: detail.product });
    } catch (error) {
      this.setData({
        product: null,
        error:
          error instanceof Error ? error.message : "购买须知加载失败，请重试",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  retry() {
    void this.loadPage();
  },
  productId: "",
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
