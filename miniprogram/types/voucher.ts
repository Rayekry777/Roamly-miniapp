import type { MediaAsset } from "./media";
import type { ShopSummary } from "./post";

export type VoucherProductType = "PACKAGE" | "CASH" | "DISCOUNT" | "MULTI_USE";
export type VoucherSaleStatus =
  | "SCHEDULED"
  | "ON_SALE"
  | "OFF_SALE"
  | "SOLD_OUT"
  | "ENDED";
export type VoucherProductStatus = VoucherSaleStatus | "DRAFT";
export type VoucherProductSort =
  | "RECOMMENDED"
  | "SALES"
  | "DISTANCE"
  | "PRICE_ASC";
export type VoucherOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELED"
  | "REFUNDING"
  | "REFUNDED";
export type UserVoucherStatus =
  | "UNUSED"
  | "PARTIALLY_USED"
  | "USED"
  | "EXPIRED"
  | "REFUNDING"
  | "REFUNDED";

export interface VoucherProductResponse {
  id: string | number;
  shopId: string | number;
  title: string;
  subtitle?: string;
  cover?: MediaAsset | string;
  payAmount: number;
  originalAmount?: number;
  stock?: number;
  soldCount?: number;
  perUserLimit?: number;
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
  productTypeLabel?: string;
  productType?: VoucherProductType;
  faceValueAmount?: number;
  minimumSpendAmount?: number;
  totalUseCount?: number;
  totalStock?: number;
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
  usageRuleRows?: Array<{
    dayOfWeek?: string;
    closed?: boolean;
    periods?: Array<{ open?: string; close?: string }>;
  }>;
  details?: Array<{
    id?: string | number;
    sectionType?: string;
    title?: string;
    content?: string;
    sortOrder?: number;
  }>;
  tags?: Array<{
    id?: string | number;
    text?: string;
    iconKey?: string;
    colorToken?: string;
    sortOrder?: number;
  }>;
  cashRule?: {
    faceValueAmount?: number;
    minimumSpendAmount?: number;
    description?: string;
  };
  discountRule?: {
    discountText?: string;
    applicableScope?: string;
    usagePeriodText?: string;
    description?: string;
  };
  multiUseRule?: {
    totalUseCount?: number;
    useUnit?: string;
    description?: string;
  };
  voucherLabel?: string;
}

export interface VoucherProduct {
  id: string;
  shopId: string;
  title: string;
  subtitle: string;
  cover: string;
  payAmount: number;
  originalAmount?: number;
  payAmountText: string;
  stock?: number;
  soldCount: number;
  perUserLimit?: number;
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
  benefitText: string;
  voucherLabel?: string;
  displayTags?: string[];
  details?: Array<{
    id: string;
    sectionType: string;
    title: string;
    content: string;
    sortOrder: number;
  }>;
  tags?: Array<{
    id: string;
    text: string;
    iconKey: string;
    colorToken?: string;
    sortOrder: number;
  }>;
  cashRule?: VoucherProductResponse["cashRule"];
  discountRule?: VoucherProductResponse["discountRule"];
  multiUseRule?: VoucherProductResponse["multiUseRule"];
}

export interface VoucherProductListItemResponse {
  product: VoucherProductResponse;
  shop: ShopSummary;
  distance?: number;
}

export interface VoucherProductListItem {
  product: VoucherProduct;
  shop: ShopSummary;
  distance?: number;
  distanceText: string;
  /** Stable primitive key for wx:for; nested keys such as product.id are not supported by WXML. */
  itemKey: string;
}

export interface VoucherProductListQuery {
  cityCode: string;
  typeId?: string;
  keyword?: string;
  sort: VoucherProductSort;
  page?: number;
  size?: number;
  longitude?: number;
  latitude?: number;
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
  productCover?: string;
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
  productCover?: string;
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
  scenario?: "MOCK_SUCCESS" | "MOCK_FAILURE";
}

export interface VoucherPaymentResponse {
  paymentMode: "MOCK" | "WECHAT" | "DISABLED";
  paymentAvailable: boolean;
  unavailableMessage?: string;
  paymentParams?: {
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  } | null;
  transactionId?: string | number | null;
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
  description?: string;
  reasonCode?: string;
  quantity?: number;
  requestedTime?: string;
  processedTime?: string;
  productTitle?: string;
  paymentChannel?: string;
  refundNo?: string;
  merchantOrderNo?: string;
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
  payAmount: number;
  availableStock: number;
  serverTime: string;
  paymentExpireTime: string;
  unitAmountText: string;
  totalAmountText: string;
  payAmountText: string;
}

export type VoucherOrderStatusFilter = VoucherOrderStatus | "ALL";
export type UserVoucherStatusFilter = UserVoucherStatus | "ALL";
