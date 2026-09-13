import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("nearby and shop page contract", () => {
  it("renders category discovery loading, error, empty and pagination states", () => {
    const view = readFileSync(
      "miniprogram/package-shop/pages/list/index.wxml",
      "utf8",
    );
    const logic = readFileSync(
      "miniprogram/package-shop/pages/list/index.ts",
      "utf8",
    );
    expect(view).toContain("shop-skeleton");
    expect(view).toContain('description="{{error}}"');
    expect(view).toContain("没有找到相关商户");
    expect(view).toContain("category-grid");
    expect(logic).toContain("requestSequence");
    expect(logic).toContain("mergeShops");
  });

  it("uses the home location without requesting location in the category page", () => {
    const list = readFileSync(
      "miniprogram/package-shop/pages/list/index.ts",
      "utf8",
    );
    expect(list).toContain('selectionMode === "REAL_LOCATION"');
    expect(list).toContain("请先在首页开启定位");
    expect(list).not.toContain("locateForNearby");
    expect(list).not.toContain("openCityPicker");
    expect(list).toContain("locationFingerprint");
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
    expect(view).toContain("related-post__avatar");
    expect(view).toContain("src=\"{{item.author.icon || ''}}\"");
    expect(view).toContain('catch:tap="openAuthor"');
    expect(service).toContain("商户动态响应格式异常");
    expect(service).not.toContain("mock");
  });

  it("keeps the shop detail page free from unused Lottie and null image inputs", () => {
    const detail = readFileSync(
      "miniprogram/package-shop/pages/detail/index.wxml",
      "utf8",
    );
    const detailConfig = readFileSync(
      "miniprogram/package-shop/pages/detail/index.json",
      "utf8",
    );
    const voucherCard = readFileSync(
      "miniprogram/components/voucher-product-card/index.wxml",
      "utf8",
    );

    expect(detailConfig).not.toContain("success-motion");
    expect(detail).toContain("src=\"{{item || ''}}\"");
    expect(voucherCard).toContain("src=\"{{item.product.cover || ''}}\"");
  });
});
