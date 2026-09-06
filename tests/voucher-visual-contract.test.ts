import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function appearsInOrder(source: string, ...markers: string[]) {
  let previous = -1;
  markers.forEach((marker) => {
    const index = source.indexOf(marker);
    expect(index, `missing visual layer: ${marker}`).toBeGreaterThanOrEqual(0);
    expect(index, `${marker} is out of visual order`).toBeGreaterThan(previous);
    previous = index;
  });
}

describe("团购券参考图视觉层级契约", () => {
  it("附近页按头部、筛选、商品流顺序排列", () => {
    const nearby = read("miniprogram/pages/nearby/index.wxml");
    appearsInOrder(
      nearby,
      "nearby-header",
      "type-scroll",
      "nearby-filter-row",
      "product-list",
    );
    expect(nearby).not.toContain('bind:tap="openNearbyShops"');
    expect(nearby).toContain('bind:tap="retryLocation"');
    expect(nearby).toContain('<app-image src="{{item.icon}}" kind="category"');
  });

  it("商品详情按首图、摘要、须知、门店和购买栏排列", () => {
    appearsInOrder(
      read("miniprogram/package-voucher/pages/product/index.wxml"),
      'class="hero"',
      "product-summary-card",
      "purchase-notice",
      "shop-card",
      "purchase-bar",
    );
  });

  it("订单与支付页面保留参考图的卡片层级", () => {
    appearsInOrder(
      read("miniprogram/package-order/pages/confirm/index.wxml"),
      "order-card",
      "amount-card",
      "payment-card",
      "submit-bar",
    );
    appearsInOrder(
      read("miniprogram/package-order/pages/result/index.wxml"),
      "result-hero",
      "ticket-card",
      "result-actions",
    );
    expect(read("miniprogram/package-order/pages/result/index.wxml")).toContain(
      'wx:if="{{detail.order.status !== \'PAID\'}}" class="result-amount"',
    );
    appearsInOrder(
      read("miniprogram/package-shop/pages/list/index.wxml"),
      "shop-list-toolbar",
      "shop-list-search",
      'wx:else class="shop-list"',
    );
    expect(read("miniprogram/package-order/pages/list/index.wxml")).toContain(
      "t-search",
    );
    expect(read("miniprogram/package-order/pages/list/index.wxml")).toContain(
      "visibleOrders",
    );
  });

  it("到店使用、券码和退款页面保持状态先于操作的顺序", () => {
    appearsInOrder(
      read("miniprogram/package-order/pages/detail/index.wxml"),
      "order-state",
      "usage-limit",
      "usage-shop",
      "voucher-list",
      "shop-summary",
    );
    appearsInOrder(
      read("miniprogram/package-voucher/pages/wallet/index.wxml"),
      "filters",
      "voucher-card",
      "qr-mask",
    );
    appearsInOrder(
      read("miniprogram/package-order/pages/refund/index.wxml"),
      "refund-product-card",
      "退款数量",
      "退款金额",
      "退款原因",
      "reason-mask",
    );
    appearsInOrder(
      read("miniprogram/package-order/pages/refund-detail/index.wxml"),
      "refund-hero",
      "refund-info",
      "original-order",
    );
    const wallet = read("miniprogram/package-voucher/pages/wallet/index.wxml");
    expect(wallet).toContain(
      "item.status === 'UNUSED' || item.status === 'PARTIALLY_USED'",
    );
    expect(wallet).toContain("退款处理中，暂不可使用");
    expect(wallet).not.toContain(
      "item.status === 'UNUSED' || item.status === 'REFUNDING'",
    );
    const detail = read("miniprogram/package-order/pages/detail/index.wxml");
    expect(detail).toContain('class="order-product roamly-panel"');
    expect(detail).toContain('class="refund-progress roamly-panel');
    expect(detail).toContain("hasUsableVoucher");
    expect(detail).toContain("openRefundDetail");
    expect(detail).not.toContain(
      "item.status === 'UNUSED' || item.status === 'REFUNDING'",
    );
  });

  it("参考项目的营销入口不会混入当前 Roamly 页面", () => {
    const source = [
      read("miniprogram/pages/me/index.wxml"),
      read("miniprogram/pages/nearby/index.wxml"),
    ].join("\n");
    [
      "新人福利",
      "最近浏览",
      "钱包",
      "草稿箱",
      "笔记达人中心",
      "口味档案",
      "签到",
    ].forEach((marker) => {
      expect(source).not.toContain(marker);
    });
  });
});
