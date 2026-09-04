import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import projectConfig from "../project.config.json";

describe("阶段 15 消费者设计基线", () => {
  it("不提交真实微信 AppID", () => {
    expect(projectConfig.appid).toBe("touristappid");
  });

  it("保留冻结的 Roamly 视觉令牌", () => {
    const tokens = fs.readFileSync(
      path.resolve("miniprogram/styles/tokens.wxss"),
      "utf8",
    );

    expect(tokens).toContain("--roamly-primary: #ff5f57");
    expect(tokens).toContain("--roamly-accent: #8275ff");
    expect(tokens).toContain("--roamly-text: #242331");
    expect(tokens).toContain("--roamly-muted: #8f8d99");
    expect(tokens).toContain("--roamly-bg: #f4f5fb");
    expect(tokens).toContain("--roamly-surface: #ffffff");
    expect(tokens).toContain("--roamly-border: #ececf3");
  });
});
