import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getVoucherProduct,
  listVoucherProducts,
} from "../miniprogram/api/voucher-product";
import {
  cancelMyOrder,
  createVoucherOrder,
  listMyOrders,
  prepareMyOrderPayment,
} from "../miniprogram/api/order";
import { requestOrderRefund } from "../miniprogram/api/refund";
import {
  loadVoucherProduct,
  normalizeVoucherProduct,
} from "../miniprogram/services/voucher-product";
import {
  confirmOrder,
  loadMyOrders,
  loadMyOrder,
  normalizeOrder,
  orderStatusText,
} from "../miniprogram/services/order";

const requestMock = vi.hoisted(() => vi.fn());
vi.mock("../miniprogram/utils/request", () => ({ request: requestMock }));

describe("voucher, order and wallet contracts", () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockResolvedValue({ code: "OK", message: "ok", data: null });
  });

  it("shows quantity-total subsidy breakdown without changing server payment", async () => {
    requestMock.mockResolvedValue({
      data: {
        productId: "1",
        shopId: "2",
        quantity: 2,
        totalAmount: 20000,
        payAmount: 17000,
        merchantSubsidyAmount: 2000,
        platformDiscountAmount: 1000,
      },
    });
    const result = await confirmOrder("1", 2);
    expect(result).toMatchObject({
      merchantSubsidyAmountText: "20.00",
      platformDiscountAmountText: "10.00",
      promotionAmountText: "30.00",
      payAmountText: "170.00",
      hasPromotion: true,
    });
    requestMock.mockResolvedValue({
      data: {
        productId: "1",
        shopId: "2",
        totalAmount: 10000,
        payAmount: 10000,
      },
    });
    expect(await confirmOrder("1", 1)).toMatchObject({
      hasPromotion: false,
      promotionAmountText: "0.00",
    });
  });

  it("uses target voucher product paths and public auth", async () => {
    await listVoucherProducts("9007199254740993");
    await getVoucherProduct("9007199254740993");
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      "/v1/shops/9007199254740993/voucher-products",
      { auth: "public", showError: false },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      "/v1/voucher-products/9007199254740993",
      { auth: "public", showError: false },
    );
  });

  it("keeps order writes non-deduplicated and filters optional status", async () => {
    await createVoucherOrder("7", { quantity: 1 }, "stage22-miniapp-1");
    await listMyOrders({
      page: 2,
      size: 20,
      status: "PAID",
      productType: "CASH",
    });
    await cancelMyOrder("8");
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      "/v1/voucher-products/7/orders",
      {
        method: "POST",
        data: { quantity: 1 },
        dedupe: false,
        showError: false,
        headers: { "Idempotency-Key": "stage22-miniapp-1" },
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(2, "/v1/users/me/orders", {
      data: { page: 2, size: 20, status: "PAID", productType: "CASH" },
      auth: "required",
      showError: false,
    });
    expect(requestMock).toHaveBeenNthCalledWith(3, "/v1/users/me/orders/8", {
      method: "DELETE",
      auth: "required",
      dedupe: false,
      showError: false,
    });
  });

  it("uses selected vouchers for the current order refund contract", async () => {
    await requestOrderRefund(
      {
        orderId: "order-1",
        voucherIds: ["voucher-1"],
        reasonCode: "OTHER",
        description: "说明",
      },
      "refund-contract-1",
    );
    expect(requestMock).toHaveBeenCalledWith(
      "/v1/users/me/refunds",
      expect.objectContaining({
        data: {
          orderId: "order-1",
          voucherIds: ["voucher-1"],
          reasonCode: "OTHER",
          description: "说明",
        },
      }),
    );
  });

  it("sends the backend-authoritative CANCELED order filter", async () => {
    await listMyOrders({ status: "CANCELED" });
    expect(requestMock).toHaveBeenCalledWith("/v1/users/me/orders", {
      data: { page: 1, size: 10, status: "CANCELED" },
      auth: "required",
      showError: false,
    });
    expect(orderStatusText("CANCELED")).toBe("已取消");
  });

  it("adapts the backend order page and keeps refund aggregate filters server-side", async () => {
    requestMock.mockResolvedValueOnce({
      code: "OK",
      message: "ok",
      data: {
        items: [
          {
            id: "6007",
            shopId: "1",
            productId: "3003",
            productTitle: "退款订单",
            quantity: 1,
            unitAmount: 1000,
            totalAmount: 1000,
            payAmount: 1000,
            status: "REFUNDED",
            createdTime: "2026-09-03T15:00:00",
          },
        ],
        page: 1,
        size: 10,
        total: 1,
      },
    });

    const result = await loadMyOrders({ status: "REFUNDING" });

    expect(requestMock).toHaveBeenCalledWith("/v1/users/me/orders", {
      data: { page: 1, size: 10, status: "REFUNDING" },
      auth: "required",
      showError: false,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.statusText).toBe("已退款");
    expect(result.total).toBe(1);
  });

  it("prepares payment through the side-effect-free payment capability endpoint", async () => {
    await prepareMyOrderPayment("9007199254740997");
    expect(requestMock).toHaveBeenCalledWith(
      "/v1/users/me/orders/9007199254740997/payments/prepare",
      { method: "POST", auth: "required", dedupe: false, showError: false },
    );
  });

  it("adapts wrapped product detail and preserves large string ids", async () => {
    requestMock.mockResolvedValueOnce({
      code: "OK",
      message: "ok",
      data: {
        product: {
          id: "9007199254740993",
          shopId: "9007199254740995",
          title: "双人套餐",
          payAmount: 9900,
        },
        shop: {
          id: "9007199254740995",
          name: "漫游咖啡实验室",
          score: 46,
        },
      },
    });

    const detail = await loadVoucherProduct("9007199254740993");

    expect(detail.product.id).toBe("9007199254740993");
    expect(detail.shop.id).toBe("9007199254740995");
    expect(detail.shop.score).toBe(4.6);
  });

  it("adapts wrapped order detail with product and shop summaries", async () => {
    requestMock.mockResolvedValueOnce({
      code: "OK",
      message: "ok",
      data: {
        order: {
          id: "9007199254740997",
          shopId: "9007199254740995",
          productId: "9007199254740993",
          productTitle: "双人套餐",
          quantity: 1,
          unitAmount: 9900,
          totalAmount: 9900,
          payAmount: 9900,
          status: "CANCELED",
          createdTime: "2026-09-04T10:00:00",
        },
        product: {
          id: "9007199254740993",
          shopId: "9007199254740995",
          title: "双人套餐",
          payAmount: 9900,
        },
        shop: { id: "9007199254740995", name: "漫游咖啡实验室" },
      },
    });

    const detail = await loadMyOrder("9007199254740997");

    expect(detail.order.id).toBe("9007199254740997");
    expect(detail.order.statusText).toBe("已取消");
    expect(detail.product.id).toBe("9007199254740993");
    expect(detail.shop.id).toBe("9007199254740995");
  });

  it("normalizes string ids and cents without inventing payment success", () => {
    const product = normalizeVoucherProduct({
      id: 1,
      shopId: 2,
      title: "双人套餐",
      payAmount: 9900,
    });
    expect(product.id).toBe("1");
    expect(product.shopId).toBe("2");
    expect(product.payAmountText).toBe("99.00");
    const order = normalizeOrder({
      id: 3,
      shopId: 2,
      productId: 1,
      productTitle: "双人套餐",
      quantity: 1,
      unitAmount: 9900,
      totalAmount: 9900,
      payAmount: 9900,
      status: "PENDING_PAYMENT",
      createdTime: "2026-09-03",
      productType: "CASH",
      productTypeLabel: "代金券",
    });
    expect(order.id).toBe("3");
    expect(order.statusText).toBe("待支付");
    expect(order.productType).toBe("CASH");
    expect(order.productTypeLabel).toBe("代金券");
  });

  it("shows voucher face value and sale price without discount effects", () => {
    const cash = normalizeVoucherProduct({
      id: 1,
      shopId: 2,
      title: "代金券",
      payAmount: 8000,
      originalAmount: 10000,
      faceValueAmount: 10000,
      productType: "CASH",
    });
    const discount = normalizeVoucherProduct({
      id: 2,
      shopId: 2,
      title: "折扣券",
      payAmount: 8000,
      originalAmount: 10000,
      productType: "DISCOUNT",
    });
    expect(cash.benefitText).toBe("抵扣¥100.00");
    expect(cash.payAmountText).toBe("80.00");
    expect("discountText" in cash).toBe(false);
    expect(discount.benefitText).toBe("到店核销");
  });
});
