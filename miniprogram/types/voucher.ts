import type { MediaAsset } from "./media";
import type { ShopSummary } from "./post";

export type VoucherSaleType = "NORMAL" | "SECKILL";
export type VoucherProductStatus =
  | "DRAFT"
  | "ON_SALE"
  | "OFF_SALE"
  | "SOLD_OUT";
export type VoucherOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELLED"
  | "REFUNDING"
  | "REFUNDED";
export type UserVoucherStatus = "UNUSED" | "USED" | "EXPIRED" | "REFUNDED";

export interface VoucherProductResponse {
  id: string | number;
  shopId: string | number;
  title: string;
  subtitle?: string;
  cover?: MediaAsset | string;
  payAmount: number;
  originalAmount?: number;
  discountAmount?: number;
  stock?: number;
  soldCount?: number;
  perUserLimit?: number;
  saleType?: VoucherSaleType;
  status?: VoucherProductStatus;
  saleStartTime?: string;
  saleEndTime?: string;
  validityText?: string;
  usageRules?: string;
}

export interface VoucherProduct {
  id: string;
  shopId: string;
  title: string;
  subtitle: string;
  cover: string;
  payAmount: number;
  originalAmount?: number;
  discountAmount?: number;
  payAmountText: string;
  originalAmountText?: string;
  stock?: number;
  soldCount: number;
  perUserLimit?: number;
  saleType: VoucherSaleType;
  status: VoucherProductStatus;
  saleStartTime?: string;
  saleEndTime?: string;
  validityText: string;
  usageRules: string;
}

export interface VoucherOrderResponse {
  id: string | number;
  orderNo?: string;
  userId?: string | number;
  shopId: string | number;
  productId: string | number;
  productTitle: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  payAmount: number;
  status: VoucherOrderStatus;
  createdTime: string;
  paidTime?: string;
  cancelledTime?: string;
  expireTime?: string;
}

export interface VoucherOrder {
  id: string;
  orderNo: string;
  shopId: string;
  productId: string;
  productTitle: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  payAmount: number;
  unitAmountText: string;
  totalAmountText: string;
  payAmountText: string;
  status: VoucherOrderStatus;
  statusText: string;
  createdTime: string;
  paidTime?: string;
  cancelledTime?: string;
  expireTime?: string;
}

export interface UserVoucherResponse {
  id: string | number;
  voucherCode: string;
  orderId: string | number;
  productId: string | number;
  productTitle: string;
  shop: ShopSummary;
  status: UserVoucherStatus;
  validFrom?: string;
  expireTime?: string;
  usedTime?: string;
  usageRules?: string;
}

export interface UserVoucher {
  id: string;
  voucherCode: string;
  orderId: string;
  productId: string;
  productTitle: string;
  shop: ShopSummary;
  status: UserVoucherStatus;
  statusText: string;
  validFrom?: string;
  expireTime?: string;
  usedTime?: string;
  usageRules: string;
}

export interface VoucherOrderCreateRequest {
  quantity: 1;
}

export type VoucherOrderStatusFilter = VoucherOrderStatus | "ALL";
export type UserVoucherStatusFilter = UserVoucherStatus | "ALL";
