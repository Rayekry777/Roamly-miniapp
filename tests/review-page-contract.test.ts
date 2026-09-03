import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("review page contract", () => {
  it("supports sorting, paging, empty/error states and editable reviews", () => {
    const view = readFileSync(
      "miniprogram/package-shop/pages/reviews/index.wxml",
      "utf8",
    );
    const logic = readFileSync(
      "miniprogram/package-shop/pages/reviews/index.ts",
      "utf8",
    );

    expect(view).toContain("sortOptions");
    expect(view).toContain("reviews-skeletons");
    expect(view).toContain('description="{{error}}"');
    expect(view).toContain('bind:tap="editReview"');
    expect(view).toContain("verifiedConsumption");
    expect(logic).toContain("onReachBottom");
    expect(logic).toContain("mergeReviews");
    expect(logic).toContain("REVIEW_ALREADY_EXISTS");
  });

  it("keeps client payload free of verified-consumption flags", () => {
    const logic = readFileSync(
      "miniprogram/package-shop/pages/reviews/index.ts",
      "utf8",
    );
    const api = readFileSync("miniprogram/api/review.ts", "utf8");

    expect(logic).not.toContain("verifiedConsumption:");
    expect(api).not.toContain("verifiedConsumption:");
  });

  it("supports text, score, media upload and destructive edit actions", () => {
    const view = readFileSync(
      "miniprogram/package-shop/pages/reviews/index.wxml",
      "utf8",
    );
    const logic = readFileSync(
      "miniprogram/package-shop/pages/reviews/index.ts",
      "utf8",
    );

    expect(view).toContain("score-picker__stars");
    expect(view).toContain("draft-media-grid");
    expect(view).toContain("删除点评");
    expect(logic).toContain("uploadTemporaryImage");
    expect(logic).toContain("deleteTemporaryImage");
    expect(logic).toContain("removeReview");
  });

  it("registers the reviews page in the shop subpackage", () => {
    const app = readFileSync("miniprogram/app.json", "utf8");
    expect(app).toContain('"pages/reviews/index"');
  });
});
