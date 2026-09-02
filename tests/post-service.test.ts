import { describe, expect, it } from "vitest";
import {
  buildPostCreateRequest,
  toDraftSubmissionError,
  validatePostDraft,
} from "../miniprogram/services/post";
import type { PostDraft } from "../miniprogram/types";

function draft(patch: Partial<PostDraft> = {}): PostDraft {
  return {
    title: "",
    content: "今天沿河散步",
    media: [],
    shopVisit: false,
    section: null,
    shop: null,
    submitting: false,
    updatedAt: 0,
    ...patch,
  };
}

describe("post publish service", () => {
  it("omits hidden shop fields for an ordinary post", () => {
    expect(buildPostCreateRequest(draft())).toEqual({
      content: "今天沿河散步",
      shopVisit: false,
    });
  });

  it("submits string media, section and shop ids for a shop visit", () => {
    const request = buildPostCreateRequest(
      draft({
        title: "  巷口咖啡  ",
        media: [
          {
            localPath: "temp.jpg",
            status: "DONE",
            asset: {
              id: "9223372036854775807",
              url: "/blogs/example.jpg",
              mimeType: "image/jpeg",
              size: 1024,
            },
          },
        ],
        shopVisit: true,
        section: {
          id: "9223372036854775806",
          code: "COFFEE",
          name: "咖啡漫游",
          allowShopVisit: true,
          followedByMe: false,
        },
        shop: { id: "9223372036854775805", name: "巷口咖啡" },
      }),
    );

    expect(request).toEqual({
      title: "巷口咖啡",
      content: "今天沿河散步",
      mediaIds: ["9223372036854775807"],
      shopVisit: true,
      sectionId: "9223372036854775806",
      shopId: "9223372036854775805",
    });
  });

  it("requires both an allowed section and a shop for shop visits", () => {
    expect(validatePostDraft(draft({ shopVisit: true }))).toEqual({
      field: "section",
      message: "请选择探店分区",
    });
    expect(
      validatePostDraft(
        draft({
          shopVisit: true,
          section: {
            id: "daily",
            code: "ROAM_DAILY",
            name: "漫游日常",
            allowShopVisit: false,
            followedByMe: false,
          },
        }),
      ),
    ).toEqual({
      field: "section",
      message: "当前分区不允许发布探店动态",
    });
  });

  it("blocks submission while an image is unfinished", () => {
    expect(
      validatePostDraft(
        draft({ media: [{ localPath: "temp.jpg", status: "FAILED" }] }),
      ),
    ).toEqual({
      field: "media",
      message: "请先完成或移除上传失败的图片",
    });
  });

  it("maps server field errors back to the matching publisher section", () => {
    const error = Object.assign(new Error("请求参数格式错误"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      fieldErrors: [{ field: "shopId", message: "请选择关联商户" }],
    });

    expect(toDraftSubmissionError(error)).toMatchObject({
      field: "shop",
      message: "请选择关联商户",
    });
  });
});
