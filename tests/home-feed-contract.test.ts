import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  postDetailUrl,
  sectionDetailUrl,
} from "../miniprogram/utils/routes";

describe("home feed contract", () => {
  it("renders independent recommendation and following entry points", () => {
    const view = readFileSync("miniprogram/pages/home/index.wxml", "utf8");

    expect(view).toContain('data-mode="RECOMMENDED"');
    expect(view).toContain('data-mode="FOLLOWING"');
    expect(view).toContain("<section-scroll");
    expect(view).toContain("<post-card");
    expect(view).toContain('bind:openhighlight="openHighlight"');
  });

  it("keeps post card in the agreed information order", () => {
    const view = readFileSync(
      "miniprogram/components/post-card/index.wxml",
      "utf8",
    );
    const order = [
      "post-card__header",
      "post-card__content",
      "<post-media-grid",
      "post-card__actions",
      "<highlight-comment",
    ].map((token) => view.indexOf(token));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it("passes comment focus without converting string ids", () => {
    expect(
      postDetailUrl("9223372036854775807", {
        focusCommentId: "9223372036854775806",
      }),
    ).toBe(
      "/package-post/pages/detail/index?id=9223372036854775807&focusCommentId=9223372036854775806",
    );
    expect(sectionDetailUrl("9223372036854775805")).toBe(
      "/package-section/pages/detail/index?id=9223372036854775805",
    );
  });

  it("registers honest placeholders for later detail stages", () => {
    const appConfig = JSON.parse(
      readFileSync("miniprogram/app.json", "utf8"),
    ) as { subpackages: Array<{ root: string; pages: string[] }> };

    expect(appConfig.subpackages).toEqual(
      expect.arrayContaining([
        { root: "package-post", pages: ["pages/detail/index"] },
        { root: "package-section", pages: ["pages/detail/index"] },
      ]),
    );
    for (const path of [
      "miniprogram/package-post/pages/detail/index.wxml",
      "miniprogram/package-section/pages/detail/index.wxml",
    ]) {
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, "utf8")).toContain("后续阶段接入");
    }
  });
});
