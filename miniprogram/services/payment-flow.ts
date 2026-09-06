import { payOrder, prepareOrderPayment } from "./order";
import type { VoucherPaymentResponse } from "../types";

export type PaymentMode = "MOCK" | "WECHAT" | "DISABLED";
export type PaymentOutcome = "SUCCESS" | "FAILED" | "CANCELLED";

function chooseMockResult(): Promise<PaymentOutcome> {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList: ["模拟支付成功", "模拟支付失败", "暂不支付"],
      success: (result) =>
        resolve(
          (["SUCCESS", "FAILED", "CANCELLED"] as const)[result.tapIndex] ||
            "CANCELLED",
        ),
      fail: () => resolve("CANCELLED"),
    });
  });
}

export async function openVoucherPayment(
  orderId: string,
  _mode: PaymentMode = "MOCK",
) {
  const prepared = await prepareOrderPayment(orderId);
  // The backend is authoritative for the active channel. Keep the optional
  // argument for callers compiled against the earlier API, but never let a
  // client-selected mode bypass the server capability response.
  const resolvedMode = prepared.paymentMode;
  if (!prepared.paymentAvailable) {
    throw new Error(
      prepared.unavailableMessage || "支付渠道暂不可用，订单已保存",
    );
  }
  if (resolvedMode === "MOCK") {
    const outcome = await chooseMockResult();
    if (outcome === "CANCELLED")
      return { outcome, payment: null as VoucherPaymentResponse | null };
    const payment = await payOrder(
      orderId,
      outcome === "SUCCESS" ? "MOCK_SUCCESS" : "MOCK_FAILURE",
    );
    return { outcome, payment };
  }
  const payment = prepared;
  if (resolvedMode === "WECHAT") {
    const params = payment.paymentParams;
    if (
      !params?.timeStamp ||
      !params.nonceStr ||
      !params.package ||
      !params.signType ||
      !params.paySign
    ) {
      throw new Error("微信支付参数尚未配置，订单已保存，可稍后支付");
    }
    await new Promise<void>((resolve, reject) => {
      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType as "MD5" | "HMAC-SHA256" | "RSA",
        paySign: params.paySign,
        success: () => resolve(),
        fail: (error) => reject(new Error(error.errMsg || "微信支付未完成")),
      });
    });
    return { outcome: "SUCCESS" as const, payment };
  }
  throw new Error("支付渠道暂不可用，订单已保存");
}
