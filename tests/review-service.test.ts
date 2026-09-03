import { describe, expect, it } from "vitest";
import { normalizeRequest } from "../miniprogram/services/review";

describe("review service", () => {
  it("trims content and removes duplicate media ids", () => {
    expect(
      normalizeRequest({
        score: 4,
        content: "  环境不错  ",
        mediaIds: ["9", "9", "10"],
      }),
    ).toEqual({ score: 4, content: "环境不错", mediaIds: ["9", "10"] });
  });

  it("rejects invalid score and content boundaries", () => {
    expect(() => normalizeRequest({ score: 0, content: "很好" })).toThrow(
      "请选择 1 到 5 分",
    );
    expect(() => normalizeRequest({ score: 5, content: "   " })).toThrow(
      "请输入点评内容",
    );
    expect(() =>
      normalizeRequest({ score: 5, content: "a".repeat(2001) }),
    ).toThrow("点评最多 2000 个字");
  });
});
