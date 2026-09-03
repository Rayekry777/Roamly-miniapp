import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadReplies,
  loadRootComments,
  submitReply,
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
        rootId: "1",
        author: { id: "2", nickName: "漫游者" },
        replyToUser: null,
        content: "继续讨论",
        deleted: false,
        postAuthor: false,
        likedCount: 0,
        likedByMe: false,
        deletable: true,
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
              rootId: 9223372036854775807n,
              author: { id: 8n, nickName: "根评论" },
              replyToUser: null,
              content: "根评论",
              deleted: false,
              postAuthor: true,
              likedCount: 1,
              likedByMe: false,
              deletable: false,
              createdTime: "2026-09-02T12:00:00",
            },
            previewReplies: [
              {
                id: 7n,
                rootId: 9223372036854775807n,
                author: { id: 6n, nickName: "回复者" },
                replyToUser: { id: 8n, nickName: "根评论" },
                content: "回复",
                deleted: false,
                postAuthor: false,
                likedCount: 0,
                likedByMe: false,
                deletable: true,
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
      postId: "9",
      rootId: "9223372036854775807",
      author: { id: "6" },
      replyToUser: { id: "8" },
    });
    expect(page.items[0]?.root).toMatchObject({
      postId: "9",
      postAuthor: true,
      replyCount: 1,
    });
  });

  it("adapts deleted placeholders and server permissions", async () => {
    api.listPostComments.mockResolvedValue({
      data: {
        items: [
          {
            root: {
              id: "11",
              rootId: "11",
              author: { id: "8", nickName: "根评论" },
              replyToUser: null,
              content: null,
              deleted: true,
              postAuthor: false,
              likedCount: 0,
              likedByMe: false,
              deletable: false,
              createdTime: "2026-09-02T12:00:00",
            },
            previewReplies: [],
            replyCount: 1,
            hasMoreReplies: false,
            nextReplyCursor: 0,
            nextReplyOffset: 0,
          },
        ],
        nextCursor: 0,
        nextOffset: 0,
        hasMore: false,
      },
    });

    const page = await loadRootComments("9", { sort: "HOT" });

    expect(page.nextCursor).toBeNull();
    expect(page.items[0]?.root).toMatchObject({
      content: "",
      status: "DELETED",
      deletable: false,
    });
  });

  it("adds the current post id to reply list and create responses", async () => {
    const reply = {
      id: "12",
      rootId: "11",
      author: { id: "7", nickName: "回复者" },
      replyToUser: { id: "8", nickName: "根评论" },
      content: "继续讨论",
      deleted: false,
      postAuthor: true,
      likedCount: 2,
      likedByMe: true,
      deletable: true,
      createdTime: "2026-09-02T12:01:00",
    };
    api.listCommentReplies.mockResolvedValue({
      data: {
        items: [reply],
        nextCursor: 100,
        nextOffset: 1,
        hasMore: true,
      },
    });
    api.createCommentReply.mockResolvedValue({ data: reply });

    const page = await loadReplies("9", "11", { size: 20 });
    const created = await submitReply("9", "12", "  继续讨论  ");

    expect(api.listCommentReplies).toHaveBeenCalledWith("11", { size: 20 });
    expect(api.createCommentReply).toHaveBeenCalledWith("12", {
      content: "继续讨论",
    });
    expect(page.items[0]).toMatchObject({
      postId: "9",
      rootId: "11",
      postAuthor: true,
      deletable: true,
    });
    expect(created.postId).toBe("9");
  });

  it("rejects malformed comment pages without creating fallback data", async () => {
    api.listPostComments.mockResolvedValue({ data: null });

    await expect(loadRootComments("9", { sort: "HOT" })).rejects.toThrow(
      "评论接口尚未完成升级",
    );
  });
});
