import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getVoucherProduct,
  listVoucherProducts,
} from "../miniprogram/api/voucher-product";
import {
  cancelMyOrder,
  createVoucherOrder,
  listMyOrders,
} from "../miniprogram/api/order";
import { normalizeVoucherProduct } from "../miniprogram/services/voucher-product";
import { normalizeOrder } from "../miniprogram/services/order";

const requestMock = vi.hoisted(() => vi.fn());
vi.mock("../miniprogram/utils/request", () => ({ request: requestMock }));

describe("voucher, order and wallet contracts", () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockResolvedValue({ code: "OK", message: "ok", data: null });
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
    await createVoucherOrder("7", { quantity: 1 });
    await listMyOrders({ page: 2, size: 20, status: "PAID" });
    await cancelMyOrder("8");
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      "/v1/voucher-products/7/orders",
      {
        method: "POST",
        data: { quantity: 1 },
        dedupe: false,
        showError: false,
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(2, "/v1/users/me/orders", {
      data: { page: 2, size: 20, status: "PAID" },
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
    });
    expect(order.id).toBe("3");
    expect(order.statusText).toBe("待支付");
  });
});
