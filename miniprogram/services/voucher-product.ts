import * as voucherApi from "../api/voucher-product";
import type {
  VoucherProduct,
  VoucherProductDetail,
  VoucherProductListItem,
  VoucherProductListQuery,
  VoucherProductResponse,
  PageResult,
} from "../types";
import { imageUrl } from "../utils/media";
import { adaptShopSummary } from "./post-card";

export const listVoucherProducts = async (
  shopId: string,
): Promise<VoucherProduct[]> => {
  const result = await voucherApi.listVoucherProducts(String(shopId));
  if (!Array.isArray(result.data)) {
    throw new Error("团购商品响应格式异常，请稍后重试");
  }
  return result.data.map(normalizeVoucherProduct);
};

export const loadVoucherProduct = async (
  productId: string,
): Promise<VoucherProductDetail> => {
  const result = await voucherApi.getVoucherProduct(String(productId));
  if (!result.data?.product || !result.data.shop) {
    throw new Error("团购商品详情响应格式异常，请稍后重试");
  }
  const product = normalizeVoucherProduct(result.data.product);
  const shop = adaptShopSummary(result.data.shop);
  if (!result.data.product.cover && shop.cover)
    product.cover = imageUrl(shop.cover);
  return {
    product,
    shop,
  };
};

export const loadVoucherProductPage = async (
  query: VoucherProductListQuery,
): Promise<PageResult<VoucherProductListItem>> => {
  const result = await voucherApi.listPublicVoucherProducts(query);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("团购商品列表响应格式异常，请稍后重试");
  }
  return {
    ...result.data,
    items: result.data.items.map((item) => {
      const shop = adaptShopSummary(item.shop);
      const product = normalizeVoucherProduct(item.product);
      if (!item.product.cover && shop.cover)
        product.cover = imageUrl(shop.cover);
      const distance =
        item.distance === undefined ? undefined : Number(item.distance);
      return {
        product,
        shop,
        distance,
        distanceText: formatDistance(distance),
      };
    }),
  };
};

export function normalizeVoucherProduct(
  value: VoucherProductResponse,
): VoucherProduct {
  const payAmount = Number(value.payAmount ?? value.priceAmount) || 0;
  const originalAmount = value.originalAmount ?? value.marketAmount;
  const legacySaleType = String(value.saleType || "");
  const productType =
    value.productType ||
    ((["PACKAGE", "CASH", "DISCOUNT", "MULTI_USE"] as const).includes(
      legacySaleType as "PACKAGE" | "CASH" | "DISCOUNT" | "MULTI_USE",
    )
      ? (legacySaleType as VoucherProduct["productType"])
      : "PACKAGE");
  const saleStatus = value.saleStatus || value.status || "ON_SALE";
  const rawUsageRules = value.usageRuleRows || value.usageRules;
  const usageRuleRows = Array.isArray(rawUsageRules)
    ? rawUsageRules
        .map((rule) => {
          const row = rule as {
            dayOfWeek?: string;
            closed?: boolean;
            periods?: Array<{ open?: string; close?: string }>;
          };
          return {
            dayOfWeek: dayLabel(row.dayOfWeek || ""),
            closed: Boolean(row.closed),
            periods: (row.periods || []).map((period) => ({
              open: period.open || "",
              close: period.close || "",
            })),
          };
        })
        .filter((rule) => rule.dayOfWeek)
    : undefined;
  const usageRules =
    usageRuleRows
      ?.map(
        (rule) =>
          `${rule.dayOfWeek}${rule.closed ? "不可用" : ` ${rule.periods.map((period) => `${period.open}-${period.close}`).join("、") || "全天"}`}`,
      )
      .join("；") ||
    (typeof value.usageRules === "string" ? value.usageRules : undefined);
  const cover =
    value.cover ?? value.coverMedia?.contentPath ?? value.coverMedia?.url;
  const savingAmount =
    originalAmount === undefined
      ? undefined
      : Math.max(0, originalAmount - payAmount);
  const discountRate =
    originalAmount && originalAmount > payAmount
      ? Math.round((payAmount / originalAmount) * 10)
      : undefined;
  return {
    id: String(value.id),
    shopId: String(value.shopId),
    title: value.title,
    subtitle: value.subtitle || value.subTitle || "到店可用",
    cover: typeof cover === "string" ? imageUrl(cover) : imageUrl(cover?.url),
    payAmount,
    originalAmount,
    discountAmount: value.discountAmount,
    payAmountText: formatAmount(payAmount),
    originalAmountText:
      originalAmount === undefined ? undefined : formatAmount(originalAmount),
    stock: value.stock ?? value.availableStock,
    soldCount: value.soldCount || 0,
    perUserLimit: value.perUserLimit ?? value.purchaseLimit,
    saleType: value.saleType || "NORMAL",
    status: saleStatus,
    saleStartTime: value.saleStartTime,
    saleEndTime: value.saleEndTime,
    validityText: value.validityText || "以商品详情为准",
    usageRules: usageRules || "请按商户规则使用",
    usageRuleRows: usageRuleRows || [],
    packageItems:
      value.packageItems?.map((item, index) => ({
        id: String(item.id ?? index),
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceAmount: item.unitPriceAmount,
      })) || [],
    validityTypeLabel: value.validityTypeLabel,
    validBeginTime: value.validBeginTime,
    validEndTime: value.validEndTime,
    validDays: value.validDays,
    excludedDates: value.excludedDates,
    productType,
    productTypeLabel: value.productTypeLabel || productTypeLabel(productType),
    saleStatusLabel: value.saleStatusLabel || saleStatusLabel(saleStatus),
    reservationRequired: value.reservationRequired,
    reservationNotice: value.reservationNotice,
    stackable: value.stackable,
    refundAnytime: value.refundAnytime,
    refundExpired: value.refundExpired,
    benefitText: benefitText(productType, value),
    savingText: savingAmount ? `省¥${formatAmount(savingAmount)}` : undefined,
    discountText: discountRate ? `${discountRate}折` : undefined,
  };
}

function benefitText(
  type: VoucherProduct["productType"],
  value: VoucherProductResponse,
): string {
  if (type === "CASH" && value.faceValueAmount)
    return `抵扣¥${formatAmount(value.faceValueAmount)}`;
  if (type === "DISCOUNT" && value.discountRateBps)
    return `${(value.discountRateBps / 1000).toFixed(1).replace(/\.0$/, "")}折优惠`;
  if (type === "MULTI_USE" && value.totalUseCount)
    return `${value.totalUseCount}次到店可用`;
  return value.validityTypeLabel || "到店团购";
}

function formatDistance(distance?: number): string {
  if (distance === undefined || !Number.isFinite(distance)) return "";
  return distance < 1000
    ? `${Math.max(1, Math.round(distance))}m`
    : `${(distance / 1000).toFixed(distance < 10000 ? 1 : 0)}km`;
}

function dayLabel(day: string): string {
  return (
    {
      MONDAY: "周一",
      TUESDAY: "周二",
      WEDNESDAY: "周三",
      THURSDAY: "周四",
      FRIDAY: "周五",
      SATURDAY: "周六",
      SUNDAY: "周日",
    }[day] || day
  );
}

function productTypeLabel(type: VoucherProduct["productType"]): string {
  return {
    PACKAGE: "套餐券",
    CASH: "代金券",
    DISCOUNT: "折扣券",
    MULTI_USE: "次卡",
  }[type];
}

function saleStatusLabel(status: VoucherProduct["status"]): string {
  return (
    {
      DRAFT: "草稿",
      SCHEDULED: "待开售",
      ON_SALE: "销售中",
      OFF_SALE: "已下架",
      SOLD_OUT: "已售罄",
      ENDED: "已结束",
    }[status] || "销售中"
  );
}

export function formatAmount(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}
