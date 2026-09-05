import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("团购改版页面契约", () => {
  it("附近页使用商品流和四种排序", () => {
    const view = readFileSync("miniprogram/pages/nearby/index.wxml", "utf8");
    const logic = readFileSync("miniprogram/pages/nearby/index.ts", "utf8");
    expect(view).toContain("voucher-product-card");
    expect(view).toContain('data-sort="PRICE_ASC"');
    expect(logic).toContain("loadVoucherProductPage");
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
    expect(detail).toContain("purchase-bar");
    expect(detail).toContain("购买须知");
    expect(confirm).toContain("submit-bar");
    expect(confirm).toContain("服务端优惠");
    expect(detailLogic).toContain("orderConfirmUrl");
    expect(detailLogic).toContain("确认订单页打开失败，请重试");
  });
});
