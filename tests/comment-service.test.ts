import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadRootComments,
  submitRootComment,
  validateCommentContent,
} from "../miniprogram/services/comment";

const api = vi.hoisted(() => ({
  createCommentReply: vi.fn(),
  createPostComment: vi.fn(),
  deleteComment: vi.fn(),
  likeComment: vi.fn(),
  listCommentReplies: vi.fn(),
  listPostComments: vi.fn(),
  unlikeComment: vi.fn(),
}));

vi.mock("../miniprogram/api/comment", () => api);

describe("comment service", () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
  });

  it("trims comment content and enforces the 1000 character limit", async () => {
    api.createPostComment.mockResolvedValue({
      data: {
        id: "1",
        postId: "9",
        author: { id: "2", nickName: "漫游者" },
        content: "继续讨论",
        likedCount: 0,
        replyCount: 0,
        likedByMe: false,
        status: "NORMAL",
        createdTime: "2026-09-02T12:00:00",
      },
    });

    await submitRootComment("9", "  继续讨论  ");

    expect(api.createPostComment).toHaveBeenCalledWith("9", {
      content: "继续讨论",
    });
    expect(() => validateCommentContent("   ")).toThrow("请输入评论内容");
    expect(() => validateCommentContent("字".repeat(1001))).toThrow(
      "评论最多 1000 个字",
    );
  });

  it("normalizes every nested business id as a string", async () => {
    api.listPostComments.mockResolvedValue({
      data: {
        items: [
          {
            root: {
              id: 9223372036854775807n,
              postId: 9n,
              author: { id: 8n, nickName: "根评论" },
              content: "根评论",
              likedCount: 1,
              replyCount: 1,
              likedByMe: false,
              status: "NORMAL",
              createdTime: "2026-09-02T12:00:00",
            },
            replies: [
              {
                id: 7n,
                postId: 9n,
                rootId: 9223372036854775807n,
                parentId: 9223372036854775807n,
                author: { id: 6n, nickName: "回复者" },
                replyToUser: { id: 8n, nickName: "根评论" },
                content: "回复",
                likedCount: 0,
                replyCount: 0,
                likedByMe: false,
                status: "NORMAL",
                createdTime: "2026-09-02T12:01:00",
              },
            ],
            replyCount: 1,
            hasMoreReplies: false,
            nextReplyCursor: null,
            nextReplyOffset: 0,
          },
        ],
        nextCursor: null,
        nextOffset: 0,
        hasMore: false,
      },
    });

    const page = await loadRootComments("9", { sort: "LATEST" });

    expect(page.items[0]?.root.id).toBe("9223372036854775807");
    expect(page.items[0]?.replies[0]).toMatchObject({
      id: "7",
      rootId: "9223372036854775807",
      parentId: "9223372036854775807",
      author: { id: "6" },
      replyToUser: { id: "8" },
    });
  });

  it("rejects malformed comment pages without creating fallback data", async () => {
    api.listPostComments.mockResolvedValue({ data: null });

    await expect(loadRootComments("9", { sort: "HOT" })).rejects.toThrow(
      "评论接口尚未完成升级",
    );
  });
});
