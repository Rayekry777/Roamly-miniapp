import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import projectConfig from "../project.config.json";
import packageJson from "../package.json";

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

  it("锁定消费者端动画基线", () => {
    const globalStyles = fs.readFileSync(
      path.resolve("miniprogram/styles/global.wxss"),
      "utf8",
    );
    const successStyles = fs.readFileSync(
      path.resolve("miniprogram/components/success-motion/index.wxss"),
      "utf8",
    );
    const successMotion = fs.readFileSync(
      path.resolve("miniprogram/components/success-motion/index.ts"),
      "utf8",
    );

    expect(packageJson.dependencies["lottie-miniprogram"]).toBe("1.0.12");
    expect(globalStyles).toContain("animation: roamly-page-in 320ms ease-out");
    expect(globalStyles).toContain(
      "transition: transform 160ms ease, opacity 160ms ease",
    );
    expect(successStyles).toContain("animation: motion-in 240ms ease-out");
    expect(successMotion).toContain("motionEnabled");
    expect(successMotion).toContain("loop: false");
    expect(successMotion).toContain("activeAnimation?.destroy()");
  });
});
