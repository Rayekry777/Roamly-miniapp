import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("section page contract", () => {
  it("renders loading, error, empty and populated states", () => {
    const view = readFileSync("miniprogram/pages/sections/index.wxml", "utf8");

    expect(view).toContain("sections-skeleton");
    expect(view).toContain('wx:elif="{{error && !sections.length}}"');
    expect(view).toContain('wx:elif="{{!sections.length}}"');
    expect(view).toContain('wx:else class="sections-list"');
  });

  it("supports section navigation and optimistic following", () => {
    const view = readFileSync("miniprogram/pages/sections/index.wxml", "utf8");
    const logic = readFileSync("miniprogram/pages/sections/index.ts", "utf8");

    expect(view).toContain('bind:tap="openSection"');
    expect(view).toContain('catch:tap="toggleFollow"');
    expect(logic).toContain("optimisticallySetSectionFollowing");
    expect(logic).toContain("rememberFollowIntent");
    expect(logic).toContain("takeFollowIntent");
  });

  it("keeps latest and hot feeds separate and supports city switching", () => {
    const view = readFileSync(
      "miniprogram/package-section/pages/detail/index.wxml",
      "utf8",
    );
    const logic = readFileSync(
      "miniprogram/package-section/pages/detail/index.ts",
      "utf8",
    );

    expect(view).toContain('data-sort="LATEST"');
    expect(view).toContain('data-sort="HOT"');
    expect(view).toContain('bind:tap="openCityPicker"');
    expect(view).toContain("<post-card");
    expect(logic).toContain("sectionStore.setScrollTop");
    expect(logic).toContain("sectionStore.shouldLoadFeed");
    expect(logic).toContain("cityStore.select(city)");
  });

  it("shows backend errors instead of fallback post data", () => {
    const service = readFileSync("miniprogram/services/section.ts", "utf8");
    const view = readFileSync(
      "miniprogram/package-section/pages/detail/index.wxml",
      "utf8",
    );

    expect(service).toContain("分区动态响应格式异常");
    expect(view).toContain('description="{{feedError}}"');
    expect(view).not.toContain("后续阶段接入");
  });
});
