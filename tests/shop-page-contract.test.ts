import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("nearby and shop page contract", () => {
  it("renders nearby loading, error, empty, filtering and pagination states", () => {
    const view = readFileSync("miniprogram/pages/nearby/index.wxml", "utf8");
    const logic = readFileSync("miniprogram/pages/nearby/index.ts", "utf8");

    expect(view).toContain("shop-skeletons");
    expect(view).toContain('description="{{error}}"');
    expect(view).toContain("当前筛选下没有找到商户");
    expect(view).toContain('data-sort="DISTANCE"');
    expect(view).toContain('bind:tap="selectType"');
    expect(logic).toContain("requestSequence");
    expect(logic).toContain("searchTimer");
    expect(logic).toContain("mergeShops");
  });

  it("downgrades location failures instead of sending partial coordinates", () => {
    const nearby = readFileSync("miniprogram/pages/nearby/index.ts", "utf8");
    const service = readFileSync("miniprogram/services/shop.ts", "utf8");

    expect(nearby).toContain('result.status === "DENIED"');
    expect(nearby).toContain('this.setData({ sort: "POPULAR" })');
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
    expect(service).toContain("商户相关动态接口尚未完成升级");
    expect(service).not.toContain("mock");
  });
});
