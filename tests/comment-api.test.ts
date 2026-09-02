import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCommentReply,
  createPostComment,
  deleteComment,
  likeComment,
  listCommentReplies,
  listPostComments,
  unlikeComment,
} from "../miniprogram/api/comment";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("../miniprogram/utils/request", () => ({ request: requestMock }));

describe("comment contract API", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({ data: null });
  });

  it("uses optional auth and removes absent root cursor fields", async () => {
    await listPostComments("9223372036854775807", {
      sort: "HOT",
      size: 10,
    });

    expect(requestMock).toHaveBeenCalledWith(
      "/v1/posts/9223372036854775807/comments",
      {
        data: { sort: "HOT", size: 10 },
        auth: "optional",
        showError: false,
      },
    );
  });

  it("uses the direct target comment id for replies", async () => {
    await listCommentReplies("root-1", { cursor: 100, offset: 2 });
    await createCommentReply("reply-9", { content: "继续讨论" });

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      "/v1/comments/root-1/replies",
      {
        data: { cursor: 100, offset: 2 },
        auth: "optional",
        showError: false,
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      "/v1/comments/reply-9/replies",
      {
        method: "POST",
        data: { content: "继续讨论" },
        dedupe: false,
        showError: false,
      },
    );
  });

  it("keeps comment writes authenticated and non-deduplicated", async () => {
    await createPostComment("post-1", { content: "第一条评论" });
    await likeComment("comment-1");
    await unlikeComment("comment-1");
    await deleteComment("comment-1");

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      "/v1/posts/post-1/comments",
      {
        method: "POST",
        data: { content: "第一条评论" },
        dedupe: false,
        showError: false,
      },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      "/v1/comments/comment-1/like",
      { method: "PUT", dedupe: false, showError: false },
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      "/v1/comments/comment-1/like",
      { method: "DELETE", dedupe: false, showError: false },
    );
    expect(requestMock).toHaveBeenNthCalledWith(4, "/v1/comments/comment-1", {
      method: "DELETE",
      dedupe: false,
      showError: false,
    });
  });
});
