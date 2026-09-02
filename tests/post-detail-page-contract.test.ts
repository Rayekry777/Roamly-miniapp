import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shopDetailUrl } from "../miniprogram/utils/routes";

describe("post detail page contract", () => {
  it("places the shop link after media and before comments", () => {
    const view = readFileSync(
      "miniprogram/package-post/pages/detail/index.wxml",
      "utf8",
    );
    const order = [
      "post-detail__content",
      "<post-media-grid",
      "<shop-link-card",
      "post-detail__footer",
      'id="comments"',
    ].map((token) => view.indexOf(token));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
    expect(view).toContain('wx:if="{{post.shopVisit && post.shop}}"');
  });

  it("renders hot/latest threads and a fixed reply composer", () => {
    const view = readFileSync(
      "miniprogram/package-post/pages/detail/index.wxml",
      "utf8",
    );
    const style = readFileSync(
      "miniprogram/package-post/pages/detail/index.wxss",
      "utf8",
    );

    expect(view).toContain('data-sort="HOT"');
    expect(view).toContain('data-sort="LATEST"');
    expect(view).toContain("<comment-thread");
    expect(view).toContain("<reply-composer");
    expect(style).toContain("position: fixed");
  });

  it("bounds focus lookup and keeps deep replies at one visual level", () => {
    const logic = readFileSync(
      "miniprogram/package-post/pages/detail/index.ts",
      "utf8",
    );
    const threadView = readFileSync(
      "miniprogram/components/comment-thread/index.wxml",
      "utf8",
    );

    expect(logic).toContain("MAX_FOCUS_PAGES = 3");
    expect(logic).toContain("locateFocusedComment");
    expect(threadView).toContain('class="comment-thread__replies"');
    expect(threadView.match(/<comment-thread/g)).toBeNull();
  });

  it("keeps large shop ids encoded as strings", () => {
    expect(shopDetailUrl("9223372036854775807")).toBe(
      "/package-shop/pages/detail/index?id=9223372036854775807",
    );
  });
});
