import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface AppConfig {
  pages: string[];
  tabBar: { list: Array<{ pagePath: string; text: string }> };
}

describe("five-entry navigation contract", () => {
  const appConfig = JSON.parse(
    readFileSync("miniprogram/app.json", "utf8"),
  ) as AppConfig;

  it("registers home, sections, nearby and me as tab pages", () => {
    expect(appConfig.tabBar.list).toEqual([
      { pagePath: "pages/home/index", text: "首页" },
      { pagePath: "pages/sections/index", text: "分区" },
      { pagePath: "pages/nearby/index", text: "附近" },
      { pagePath: "pages/me/index", text: "我的" },
    ]);
    expect(appConfig.pages).toEqual([
      "pages/home/index",
      "pages/sections/index",
      "pages/nearby/index",
      "pages/me/index",
    ]);
  });

  it("keeps publish as the central action instead of a tab page", () => {
    const tabBarView = readFileSync(
      "miniprogram/custom-tab-bar/index.wxml",
      "utf8",
    );
    const tabBarLogic = readFileSync(
      "miniprogram/custom-tab-bar/index.ts",
      "utf8",
    );

    expect(tabBarView).toContain('aria-label="发布动态"');
    expect(tabBarView).toContain("items[3]");
    expect(appConfig.tabBar.list.some((item) => item.text === "发布")).toBe(
      false,
    );
    expect(tabBarLogic).toContain("/package-post/pages/publish/index");
  });

  it("provides complete skeleton files for new tab pages", () => {
    for (const page of ["sections", "nearby"]) {
      for (const extension of ["json", "ts", "wxml", "wxss"]) {
        expect(existsSync(`miniprogram/pages/${page}/index.${extension}`)).toBe(
          true,
        );
      }
    }
  });
});
