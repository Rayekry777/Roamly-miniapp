import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("unified post publisher contract", () => {
  it("registers the new post publisher and routes the central action to it", () => {
    const app = JSON.parse(readFileSync("miniprogram/app.json", "utf8")) as {
      subpackages: Array<{ root: string; pages: string[] }>;
    };
    const postPackage = app.subpackages.find(
      (item) => item.root === "package-post",
    );
    const tabBar = readFileSync("miniprogram/custom-tab-bar/index.ts", "utf8");

    expect(postPackage?.pages).toContain("pages/publish/index");
    expect(tabBar).toContain("/package-post/pages/publish/index");
    expect(tabBar).not.toContain("/package-blog/pages/publish/index");
  });

  it("renders the shop visit switch, conditional selectors and draft media", () => {
    const view = readFileSync(
      "miniprogram/package-post/pages/publish/index.wxml",
      "utf8",
    );

    expect(view).toContain("<draft-media-grid");
    expect(view).toContain("<t-switch");
    expect(view).toContain('wx:if="{{draft.shopVisit}}"');
    expect(view).toContain('id="field-section"');
    expect(view).toContain('id="field-shop"');
    expect(view).toContain("将发布到「漫游日常」");
  });
});
