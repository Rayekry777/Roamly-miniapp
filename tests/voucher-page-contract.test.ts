import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("团购改版页面契约", () => {
  it("附近页只提供分类入口，分类页使用店铺卡片", () => {
    const view = readFileSync("miniprogram/pages/nearby/index.wxml", "utf8");
    const shops = readFileSync(
      "miniprogram/package-shop/pages/list/index.wxml",
      "utf8",
    );
    expect(view).toContain("openCategory");
    expect(view).not.toContain("voucher-product-card");
    expect(shops).toContain("shop-card");
    expect(shops).toContain("openVoucher");
  });

  it("详情和确认页保留固定购买/提交栏及错误重试", () => {
    const detail = readFileSync(
      "miniprogram/package-voucher/pages/product/index.wxml",
      "utf8",
    );
    const confirm = readFileSync(
      "miniprogram/package-order/pages/confirm/index.wxml",
      "utf8",
    );
    const detailLogic = readFileSync(
      "miniprogram/package-voucher/pages/product/index.ts",
      "utf8",
    );
    const notice = readFileSync(
      "miniprogram/package-voucher/pages/notice/index.wxml",
      "utf8",
    );
    expect(detail).toContain("purchase-bar");
    expect(detail).toContain("购买须知");
    expect(confirm).toContain("submit-bar");
    expect(confirm).toContain("应付金额");
    for (const view of [confirm, detail]) {
      expect(view).not.toContain('data-section="coupon"');
      expect(view).toContain("商家补贴");
      expect(view).toContain("平台补贴");
      expect(view).toContain("confirmation.promotionAmountText");
    }
    expect(confirm).toContain("payment-card");
    expect(detailLogic).toContain("confirmOpen: true");
    expect(detailLogic).toContain("refreshConfirmation(1)");
    expect(detailLogic).toContain("shopListUrl({ productId");
    expect(detailLogic).toContain("voucherNoticeUrl");
    expect(notice).toContain("购买须知");
    expect(notice).toContain("价格和销量说明");
  });

  it("券详情和券包明确额外消费线下结算", () => {
    const wallet = readFileSync(
      "miniprogram/package-voucher/pages/wallet/index.wxml",
      "utf8",
    );
    const notice = readFileSync(
      "miniprogram/package-voucher/pages/notice/index.wxml",
      "utf8",
    );
    expect(notice).toContain("额外消费由顾客与商户自行线下微信支付");
    expect(wallet).toContain("额外消费由顾客与商户自行线下微信支付");
  });

  it("结果、到店使用和退款页保留参考流程的关键层级", () => {
    const result = readFileSync(
      "miniprogram/package-order/pages/result/index.wxml",
      "utf8",
    );
    const detail = readFileSync(
      "miniprogram/package-order/pages/detail/index.wxml",
      "utf8",
    );
    const refund = readFileSync(
      "miniprogram/package-order/pages/refund/index.wxml",
      "utf8",
    );
    const refundDetail = readFileSync(
      "miniprogram/package-order/pages/refund-detail/index.wxml",
      "utf8",
    );
    expect(result).toContain("ticket-card");
    expect(result).toContain("共{{detail.vouchers.length}}张券");
    expect(result).toContain("适用门店列表");
    expect(result).toContain("支付失败");
    expect(result).toContain("暂未支付");
    expect(detail).toContain("立即用券 · 到店取");
    expect(detail).toContain("voucher-count");
    expect(refund).toContain("退款原因");
    expect(refund).toContain("100");
    expect(refundDetail).toContain("退款进度");
    expect(refundDetail).toContain("退款单号");
  });

  it("不注入参考应用中当前项目不支持的业务入口", () => {
    const nearby = readFileSync("miniprogram/pages/nearby/index.wxml", "utf8");
    const me = readFileSync("miniprogram/pages/me/index.wxml", "utf8");
    ["新人福利", "热点", "周末去哪"].forEach((label) =>
      expect(nearby).not.toContain(label),
    );
    ["签到", "最近浏览", "钱包", "草稿箱", "笔记达人中心", "口味档案"].forEach(
      (label) => expect(me).not.toContain(label),
    );
  });

  it("团购页面注册自身使用的图标组件", () => {
    const pages = [
      "miniprogram/package-voucher/pages/product",
      "miniprogram/package-voucher/pages/notice",
      "miniprogram/package-voucher/pages/wallet",
      "miniprogram/package-order/pages/confirm",
      "miniprogram/package-order/pages/result",
      "miniprogram/package-order/pages/detail",
      "miniprogram/package-order/pages/list",
      "miniprogram/package-shop/pages/list",
      "miniprogram/pages/home",
    ];
    pages.forEach((page) => {
      const view = readFileSync(`${page}/index.wxml`, "utf8");
      if (view.includes("<t-icon")) {
        expect(readFileSync(`${page}/index.json`, "utf8")).toContain(
          '"t-icon"',
        );
      }
      if (view.includes("<t-loading")) {
        expect(readFileSync(`${page}/index.json`, "utf8")).toContain(
          '"t-loading"',
        );
      }
      if (view.includes("<app-image")) {
        expect(readFileSync(`${page}/index.json`, "utf8")).toContain(
          '"app-image"',
        );
      }
      if (view.includes("<t-search")) {
        expect(readFileSync(`${page}/index.json`, "utf8")).toContain(
          '"t-search"',
        );
      }
    });
  });

  it("券码弹窗使用固定二维码并锁定页面触摸", () => {
    const view = readFileSync(
      "miniprogram/package-voucher/pages/wallet/index.wxml",
      "utf8",
    );
    const logic = readFileSync(
      "miniprogram/package-voucher/pages/wallet/index.ts",
      "utf8",
    );
    const style = readFileSync(
      "miniprogram/package-voucher/pages/wallet/index.wxss",
      "utf8",
    );
    expect(view).toContain("pageStyle");
    expect(view).toContain('catch:touchmove="noop"');
    expect(view).toContain('bindtap="closeQr"');
    expect(view).not.toContain("qr-countdown");
    expect(view).toContain("qr-grid");
    expect(logic).not.toContain("setInterval");
    expect(logic).not.toContain("qrSeconds");
    expect(logic).not.toContain("onShow()");
    expect(style).toContain("position: fixed");
    expect(style).toContain("qr-cell--dark");
  });

  it("提交订单后沿用参考项目的三选项 Mock 收银台", () => {
    const payment = readFileSync(
      "miniprogram/services/payment-flow.ts",
      "utf8",
    );
    expect(payment).toContain(
      'itemList: ["模拟支付成功", "模拟支付失败", "暂不支付"]',
    );
    expect(payment).toContain('"MOCK_SUCCESS"');
    expect(payment).toContain('"MOCK_FAILURE"');
    expect(payment).toContain("paymentAvailable");
  });
});
