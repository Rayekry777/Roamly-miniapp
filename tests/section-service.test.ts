import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadSectionPostPage,
  loadSections,
  setSectionFollowing,
} from "../miniprogram/services/section";

const api = vi.hoisted(() => ({
  followSection: vi.fn(),
  getSection: vi.fn(),
  listSectionPosts: vi.fn(),
  listSections: vi.fn(),
  unfollowSection: vi.fn(),
}));

vi.mock("../miniprogram/api/section", () => api);

describe("section service", () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
  });

  it("normalizes section ids as strings", async () => {
    api.listSections.mockResolvedValue({
      data: [
        {
          id: 9223372036854775807n,
          code: "ROAM_DAILY",
          name: "漫游日常",
          allowShopVisit: false,
          followedByMe: false,
        },
      ],
    });

    const sections = await loadSections();

    expect(sections[0]?.id).toBe("9223372036854775807");
  });

  it("adapts backend media paths and highlight content for rendering", async () => {
    api.listSectionPosts.mockResolvedValue({
      data: {
        items: [
          {
            id: "9",
            author: { id: "8", nickName: "漫游者" },
            section: {
              id: "1",
              code: "ROAM_DAILY",
              name: "漫游日常",
              allowShopVisit: false,
              followedByMe: false,
            },
            contentPreview: "沿河散步",
            media: [
              {
                id: "7",
                path: "/blogs/9/photo.webp",
                mimeType: "image/webp",
                width: 1080,
                height: 1440,
              },
            ],
            shopVisit: false,
            likedCount: 1,
            commentCount: 2,
            likedByMe: false,
            followingAuthor: false,
            createdTime: "2026-09-02T12:00:00",
            highlightComment: {
              id: "6",
              author: { id: "5", nickName: "评论者" },
              contentPreview: "风景真好",
              likedCount: 3,
              replyCount: 1,
            },
          },
        ],
        nextCursor: null,
        nextOffset: 0,
        hasMore: false,
      },
    });

    const page = await loadSectionPostPage("1", {
      sort: "LATEST",
      cityCode: "HANGZHOU",
    });

    expect(page.items[0]?.media[0]).toMatchObject({
      id: "7",
      url: "/blogs/9/photo.webp",
    });
    expect(page.items[0]?.highlightComment?.content).toBe("风景真好");
  });

  it("uses matching follow and unfollow writes", async () => {
    api.followSection.mockResolvedValue({ data: null });
    api.unfollowSection.mockResolvedValue({ data: null });

    await setSectionFollowing("1", true);
    await setSectionFollowing("1", false);

    expect(api.followSection).toHaveBeenCalledWith("1");
    expect(api.unfollowSection).toHaveBeenCalledWith("1");
  });
});
