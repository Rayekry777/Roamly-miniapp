import type { MediaAsset } from "./media";
import type { ShopSummary } from "./post";

export type VoucherSaleType = "NORMAL" | "SECKILL";
export type VoucherProductType = "PACKAGE" | "CASH" | "DISCOUNT" | "MULTI_USE";
export type VoucherSaleStatus =
  | "SCHEDULED"
  | "ON_SALE"
  | "OFF_SALE"
  | "SOLD_OUT"
  | "ENDED";
export type VoucherProductStatus = VoucherSaleStatus | "DRAFT";
export type VoucherOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELED"
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
  usageRules?:
    | string
    | Array<{
        dayOfWeek?: string;
        closed?: boolean;
        periods?: Array<{ open?: string; close?: string }>;
      }>;
  packageItems?: Array<{
    id?: string | number;
    name: string;
    quantity: number;
    unit: string;
    unitPriceAmount?: number;
  }>;
  productType?: VoucherProductType;
  productTypeLabel?: string;
  subTitle?: string;
  coverMedia?: { id?: string | number; contentPath?: string; url?: string };
  coverMediaId?: string | number;
  priceAmount?: number;
  marketAmount?: number;
  faceValueAmount?: number;
  minimumSpendAmount?: number;
  discountRateBps?: number;
  maximumDiscountAmount?: number;
  totalUseCount?: number;
  totalStock?: number;
  availableStock?: number;
  purchaseLimit?: number;
  saleStatus?: VoucherSaleStatus;
  saleStatusLabel?: string;
  validityTypeLabel?: string;
  validBeginTime?: string;
  validEndTime?: string;
  validDays?: number;
  excludedDates?: string[];
  reservationRequired?: boolean;
  reservationNotice?: string;
  stackable?: boolean;
  refundAnytime?: boolean;
  refundExpired?: boolean;
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
  usageRuleRows?: Array<{
    dayOfWeek: string;
    closed: boolean;
    periods: Array<{ open: string; close: string }>;
  }>;
  packageItems?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unitPriceAmount?: number;
  }>;
  validityTypeLabel?: string;
  validBeginTime?: string;
  validEndTime?: string;
  validDays?: number;
  excludedDates?: string[];
  productType: VoucherProductType;
  productTypeLabel: string;
  saleStatusLabel: string;
  reservationRequired?: boolean;
  reservationNotice?: string;
  stackable?: boolean;
  refundAnytime?: boolean;
  refundExpired?: boolean;
}

export interface VoucherProductDetailResponse {
  product: VoucherProductResponse;
  shop: ShopSummary;
}

export interface VoucherProductDetail {
  product: VoucherProduct;
  shop: ShopSummary;
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
  paymentExpireTime?: string;
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
  paymentExpireTime?: string;
}

export interface VoucherOrderDetailResponse {
  order: VoucherOrderResponse;
  product: VoucherProductResponse;
  shop: ShopSummary;
  serverTime?: string;
  paymentExpireTime?: string;
  paymentStatus?: "PENDING" | "SUCCEEDED" | "FAILED" | "CLOSED";
  vouchers?: UserVoucherResponse[];
}

export interface VoucherOrderDetail {
  order: VoucherOrder;
  product: VoucherProduct;
  shop: ShopSummary;
  serverTime: string;
  paymentExpireTime?: string;
  paymentStatus?: "PENDING" | "SUCCEEDED" | "FAILED" | "CLOSED";
  vouchers: UserVoucher[];
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
  quantity: number;
}

export interface VoucherPaymentRequest {
  scenario: "MOCK_SUCCESS" | "MOCK_FAILURE";
}

export interface VoucherPaymentResponse {
  transactionId: string | number;
  orderId: string | number;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CLOSED";
  amount: number;
  paidTime?: string;
  paymentExpireTime?: string;
}

export interface VoucherRefundResponse {
  id: string | number;
  voucherId: string | number;
  orderId: string | number;
  amount: number;
  status: string;
  reason?: string;
  requestedTime?: string;
  processedTime?: string;
}

export interface VoucherOrderConfirmationResponse {
  productId: string | number;
  shopId: string | number;
  productTitle: string;
  unitAmount: number;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  totalAmount: number;
  discountAmount: number;
  payAmount: number;
  availableStock: number;
  serverTime: string;
  paymentExpireTime: string;
}

export interface VoucherOrderConfirmation {
  productId: string;
  shopId: string;
  productTitle: string;
  unitAmount: number;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  totalAmount: number;
  discountAmount: number;
  payAmount: number;
  availableStock: number;
  serverTime: string;
  paymentExpireTime: string;
  unitAmountText: string;
  totalAmountText: string;
  discountAmountText: string;
  payAmountText: string;
}

export type VoucherOrderStatusFilter = VoucherOrderStatus | "ALL";
export type UserVoucherStatusFilter = UserVoucherStatus | "ALL";
