import { describe, expect, it } from "vitest";
import { adaptPostDetail } from "../miniprogram/services/post-card";

describe("post detail adapter", () => {
  it("maps backend paths, score scale, and string ids", () => {
    const detail = adaptPostDetail({
      id: "9223372036854775807",
      author: { id: "8", nickName: "漫游者" },
      section: {
        id: "7",
        code: "COFFEE",
        name: "咖啡漫游",
        allowShopVisit: true,
        followedByMe: false,
      },
      title: "巷口咖啡",
      content: "今天来探店。",
      media: [
        {
          id: "6",
          path: "/blogs/post/photo.jpg",
          mimeType: "image/jpeg",
          width: 1080,
          height: 1440,
        },
      ],
      shopVisit: true,
      shop: {
        id: "5",
        name: "巷口咖啡",
        typeId: "4",
        cover: "/blogs/shop/cover.jpg",
        address: "湖滨路 1 号",
        score: 49,
      },
      createdTime: "2026-09-02T12:00:00",
      likedCount: 3,
      commentCount: 2,
      likedByMe: false,
      followingAuthor: false,
      editable: false,
      deletable: false,
      defaultCommentSort: "HOT",
    });

    expect(detail.id).toBe("9223372036854775807");
    expect(detail.media[0]?.url).toBe("/blogs/post/photo.jpg");
    expect(detail.shop).toMatchObject({
      id: "5",
      typeId: "4",
      score: 4.9,
    });
  });
});
