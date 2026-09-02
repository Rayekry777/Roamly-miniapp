import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { postDetailUrl, sectionDetailUrl } from "../miniprogram/utils/routes";

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

  it("keeps post detail honest and registers the implemented section detail", () => {
    const appConfig = JSON.parse(
      readFileSync("miniprogram/app.json", "utf8"),
    ) as { subpackages: Array<{ root: string; pages: string[] }> };

    expect(appConfig.subpackages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          root: "package-post",
          pages: expect.arrayContaining(["pages/detail/index"]),
        }),
        { root: "package-section", pages: ["pages/detail/index"] },
      ]),
    );
    const postDetail = "miniprogram/package-post/pages/detail/index.wxml";
    const sectionDetail = "miniprogram/package-section/pages/detail/index.wxml";
    expect(existsSync(postDetail)).toBe(true);
    expect(readFileSync(postDetail, "utf8")).toContain("后续阶段接入");
    expect(existsSync(sectionDetail)).toBe(true);

    const sectionView = readFileSync(sectionDetail, "utf8");
    expect(sectionView).toContain('data-sort="LATEST"');
    expect(sectionView).toContain('data-sort="HOT"');
    expect(sectionView).toContain('bind:tap="openCityPicker"');
    expect(sectionView).toContain('bind:tap="toggleSectionFollow"');
    expect(sectionView).toContain("<post-card");
  });
});
