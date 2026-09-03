import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createShopReview,
  deleteMyShopReview,
  listShopReviews,
  updateMyShopReview,
} from "../miniprogram/api/review";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("../miniprogram/utils/request", () => ({ request: requestMock }));

describe("review requests", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      code: "OK",
      message: "操作成功",
      data: null,
    });
  });

  it("uses optional auth and explicit sort for public review lists", async () => {
    await listShopReviews("9223372036854775807", {
      page: 2,
      size: 20,
      sort: "HIGHEST_SCORE",
    });

    expect(requestMock).toHaveBeenCalledWith(
      "/v1/shops/9223372036854775807/reviews",
      {
        data: { page: 2, size: 20, sort: "HIGHEST_SCORE" },
        auth: "optional",
        showError: false,
      },
    );
  });

  it("keeps review writes non-deduplicated and scoped to the shop", async () => {
    const payload = { score: 5, content: "很舒服", mediaIds: ["7"] };
    await createShopReview("1", payload);
    await updateMyShopReview("1", payload);
    await deleteMyShopReview("1");

    expect(requestMock).toHaveBeenNthCalledWith(1, "/v1/shops/1/reviews", {
      method: "POST",
      data: payload,
      dedupe: false,
      showError: false,
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, "/v1/shops/1/reviews/me", {
      method: "PUT",
      data: payload,
      dedupe: false,
      showError: false,
    });
    expect(requestMock).toHaveBeenNthCalledWith(3, "/v1/shops/1/reviews/me", {
      method: "DELETE",
      dedupe: false,
      showError: false,
    });
  });
});
