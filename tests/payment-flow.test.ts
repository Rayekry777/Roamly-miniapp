import { beforeEach, describe, expect, it, vi } from "vitest";

const prepareMock = vi.hoisted(() => vi.fn());
const payMock = vi.hoisted(() => vi.fn());

vi.mock("../miniprogram/services/order", () => ({
  prepareOrderPayment: prepareMock,
  payOrder: payMock,
}));

import { openVoucherPayment } from "../miniprogram/services/payment-flow";

describe("团购 Mock 支付三选一流程", () => {
  beforeEach(() => {
    prepareMock.mockClear();
    payMock.mockClear();
    prepareMock.mockResolvedValue({
      paymentMode: "MOCK",
      paymentAvailable: true,
      paymentParams: null,
      status: "PENDING",
      orderId: "order-1",
      amount: 9900,
    });
    payMock.mockResolvedValue({
      status: "SUCCEEDED",
      orderId: "order-1",
      amount: 9900,
    });
    vi.stubGlobal("wx", {
      showActionSheet: vi.fn(
        ({ success }: { success: (result: { tapIndex: number }) => void }) =>
          success({ tapIndex: 0 }),
      ),
    });
  });

  it("uses the reference three-option labels and pays only after a selection", async () => {
    const result = await openVoucherPayment("order-1");
    expect(wx.showActionSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        itemList: ["模拟支付成功", "模拟支付失败", "暂不支付"],
      }),
    );
    expect(payMock).toHaveBeenCalledWith("order-1", "MOCK_SUCCESS");
    expect(result.outcome).toBe("SUCCESS");
  });

  it("does not call the payment endpoint when the user chooses 暂不支付", async () => {
    (wx.showActionSheet as ReturnType<typeof vi.fn>).mockImplementationOnce(
      ({ success }: { success: (result: { tapIndex: number }) => void }) =>
        success({ tapIndex: 2 }),
    );
    const result = await openVoucherPayment("order-1");
    expect(payMock).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: "CANCELLED", payment: null });
  });

  it("passes the failure scenario when the user chooses 模拟支付失败", async () => {
    (wx.showActionSheet as ReturnType<typeof vi.fn>).mockImplementationOnce(
      ({ success }: { success: (result: { tapIndex: number }) => void }) =>
        success({ tapIndex: 1 }),
    );
    const result = await openVoucherPayment("order-1");
    expect(payMock).toHaveBeenCalledWith("order-1", "MOCK_FAILURE");
    expect(result.outcome).toBe("FAILED");
  });
});
