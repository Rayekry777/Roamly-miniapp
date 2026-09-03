import * as voucherApi from "../api/voucher-product";
import type { VoucherProduct, VoucherProductResponse } from "../types";
import { imageUrl } from "../utils/media";

export const listVoucherProducts = async (
  shopId: string,
): Promise<VoucherProduct[]> => {
  const result = await voucherApi.listVoucherProducts(String(shopId));
  if (!Array.isArray(result.data)) {
    throw new Error("团购商品接口尚未完成升级，请稍后重试");
  }
  return result.data.map(normalizeVoucherProduct);
};

export const loadVoucherProduct = async (
  productId: string,
): Promise<VoucherProduct> => {
  const result = await voucherApi.getVoucherProduct(String(productId));
  if (!result.data) throw new Error("团购商品不存在或已下架");
  return normalizeVoucherProduct(result.data);
};

export function normalizeVoucherProduct(
  value: VoucherProductResponse,
): VoucherProduct {
  const payAmount = Number(value.payAmount) || 0;
  const originalAmount = value.originalAmount;
  return {
    id: String(value.id),
    shopId: String(value.shopId),
    title: value.title,
    subtitle: value.subtitle || "到店可用",
    cover:
      typeof value.cover === "string"
        ? imageUrl(value.cover)
        : imageUrl(value.cover?.url),
    payAmount,
    originalAmount,
    discountAmount: value.discountAmount,
    payAmountText: formatAmount(payAmount),
    originalAmountText:
      originalAmount === undefined ? undefined : formatAmount(originalAmount),
    stock: value.stock,
    soldCount: value.soldCount || 0,
    perUserLimit: value.perUserLimit,
    saleType: value.saleType || "NORMAL",
    status: value.status || "ON_SALE",
    saleStartTime: value.saleStartTime,
    saleEndTime: value.saleEndTime,
    validityText: value.validityText || "以商品详情为准",
    usageRules: value.usageRules || "请按商户规则使用",
  };
}

export function formatAmount(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}
