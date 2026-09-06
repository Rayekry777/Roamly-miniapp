import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("nearby and shop page contract", () => {
  it("renders nearby loading, error, empty, filtering and pagination states", () => {
    const view = readFileSync("miniprogram/pages/nearby/index.wxml", "utf8");
    const logic = readFileSync("miniprogram/pages/nearby/index.ts", "utf8");

    expect(view).toContain("product-skeletons");
    expect(view).toContain('description="{{error}}"');
    expect(view).toContain("当前筛选下没有找到可购买的商品");
    expect(view).not.toContain('bind:tap="openNearbyShops"');
    expect(view).toContain('bind:tap="retryLocation"');
    expect(
      readFileSync("miniprogram/pages/nearby/index.wxss", "utf8"),
    ).toContain("background: var(--roamly-bg)");
    expect(view).toContain('data-sort="DISTANCE"');
    expect(view).toContain('bind:tap="selectType"');
    expect(
      readFileSync(
        "miniprogram/components/voucher-product-card/index.wxml",
        "utf8",
      ),
    ).toContain("product-card__cover-wrap");
    expect(logic).toContain("requestSequence");
    expect(logic).toContain("searchTimer");
    expect(logic).toContain("mergeProducts");
  });

  it("downgrades location failures instead of sending partial coordinates", () => {
    const nearby = readFileSync("miniprogram/pages/nearby/index.ts", "utf8");
    const service = readFileSync("miniprogram/services/shop.ts", "utf8");

    expect(nearby).toContain('result.status === "DENIED"');
    expect(nearby).toContain('this.setData({ sort: "RECOMMENDED" })');
    expect(service).toContain('query.sort === "DISTANCE" && !hasLocation');
  });

  it("loads detail modules only after their sections become visible", () => {
    const view = readFileSync(
      "miniprogram/package-shop/pages/detail/index.wxml",
      "utf8",
    );
    const logic = readFileSync(
      "miniprogram/package-shop/pages/detail/index.ts",
      "utf8",
    );

    expect(view).toContain('id="voucher-section"');
    expect(view).toContain('id="post-section"');
    expect(view).toContain("到店点评");
    expect(view).toContain("查看真实到店感受");
    expect(logic).toContain("createIntersectionObserver");
    expect(logic).toContain('observeOnce("#voucher-section"');
    expect(logic).toContain('observeOnce("#post-section"');
  });

  it("keeps related-post failures visible instead of substituting local data", () => {
    const view = readFileSync(
      "miniprogram/package-shop/pages/detail/index.wxml",
      "utf8",
    );
    const service = readFileSync("miniprogram/services/shop.ts", "utf8");

    expect(view).toContain('description="{{postError}}"');
    expect(service).toContain("商户动态响应格式异常");
    expect(service).not.toContain("mock");
  });
});
