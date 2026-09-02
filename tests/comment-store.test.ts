import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommentStore } from "../miniprogram/store/comment";
import type { CommentThread, PostComment } from "../miniprogram/types";

function comment(id: string, patch: Partial<PostComment> = {}): PostComment {
  return {
    id,
    postId: "post-1",
    author: { id: `user-${id}`, nickName: `用户${id}` },
    content: `评论${id}`,
    likedCount: 0,
    replyCount: 0,
    likedByMe: false,
    status: "NORMAL",
    createdTime: "2026-09-02T12:00:00+08:00",
    ...patch,
  };
}

function thread(id: string, replies: PostComment[] = []): CommentThread {
  return {
    root: comment(id, { replyCount: replies.length }),
    replies,
    replyCount: replies.length,
    hasMoreReplies: false,
    nextReplyCursor: null,
    nextReplyOffset: 0,
  };
}

describe("comment store", () => {
  const storage = new Map<string, unknown>();
  let store: CommentStore;

  beforeEach(() => {
    storage.clear();
    store = new CommentStore();
    vi.stubGlobal("wx", {
      getStorageSync: (key: string) => storage.get(key) || "",
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
      removeStorageSync: (key: string) => storage.delete(key),
    });
  });

  it("keeps hot and latest cursor and scroll state isolated", () => {
    store.applyPage(
      "post-1",
      "HOT",
      { items: [thread("1")], nextCursor: 90, nextOffset: 1, hasMore: true },
      true,
    );
    store.applyPage(
      "post-1",
      "LATEST",
      { items: [thread("2")], nextCursor: null, nextOffset: 0, hasMore: false },
      true,
    );
    store.setScrollTop("post-1", "HOT", 500);
    store.setScrollTop("post-1", "LATEST", 900);

    expect(store.getState("post-1", "HOT")).toMatchObject({
      items: [{ root: { id: "1" } }],
      nextCursor: 90,
      scrollTop: 500,
    });
    expect(store.getState("post-1", "LATEST")).toMatchObject({
      items: [{ root: { id: "2" } }],
      hasMore: false,
      scrollTop: 900,
    });
  });

  it("deduplicates roots and replies by string id", () => {
    store.applyPage(
      "post-1",
      "HOT",
      {
        items: [thread("9223372036854775807")],
        nextCursor: 10,
        nextOffset: 0,
        hasMore: true,
      },
      true,
    );
    store.applyPage(
      "post-1",
      "HOT",
      {
        items: [thread("9223372036854775807"), thread("2")],
        nextCursor: null,
        nextOffset: 0,
        hasMore: false,
      },
      false,
    );

    expect(
      store.getState("post-1", "HOT").items.map((item) => item.root.id),
    ).toEqual(["9223372036854775807", "2"]);
  });

  it("appends deep replies at one root level in both sorts", () => {
    const page = {
      items: [thread("root-1")],
      nextCursor: null,
      nextOffset: 0,
      hasMore: false,
    };
    store.applyPage("post-1", "HOT", page, true);
    store.applyPage("post-1", "LATEST", page, true);
    store.appendReply(
      "post-1",
      "root-1",
      comment("reply-2", {
        rootId: "root-1",
        parentId: "reply-1",
        replyToUser: { id: "user-1", nickName: "上层用户" },
      }),
    );

    for (const sort of ["HOT", "LATEST"] as const) {
      expect(store.getState("post-1", sort).items[0]).toMatchObject({
        replyCount: 1,
        replies: [
          {
            id: "reply-2",
            rootId: "root-1",
            parentId: "reply-1",
          },
        ],
      });
    }
  });

  it("rolls a comment like back across both sorts", () => {
    const shared = thread("root-1", [comment("reply-1")]);
    const page = {
      items: [shared],
      nextCursor: null,
      nextOffset: 0,
      hasMore: false,
    };
    store.applyPage("post-1", "HOT", page, true);
    store.applyPage("post-1", "LATEST", page, true);

    const rollback = store.optimisticallySetLiked("post-1", "reply-1", true);
    expect(store.getState("post-1", "HOT").items[0]?.replies[0]).toMatchObject({
      likedByMe: true,
      likedCount: 1,
    });

    rollback();
    expect(
      store.getState("post-1", "LATEST").items[0]?.replies[0],
    ).toMatchObject({ likedByMe: false, likedCount: 0 });
  });

  it("keeps a deleted root placeholder only when replies exist", () => {
    store.applyPage(
      "post-1",
      "HOT",
      {
        items: [thread("with-reply", [comment("reply-1")]), thread("empty")],
        nextCursor: null,
        nextOffset: 0,
        hasMore: false,
      },
      true,
    );

    store.applyDelete("post-1", "with-reply");
    store.applyDelete("post-1", "empty");

    expect(store.getState("post-1", "HOT").items).toMatchObject([
      {
        root: { id: "with-reply", status: "DELETED", content: "" },
        replies: [{ id: "reply-1" }],
      },
    ]);
  });

  it("restores one composer draft after login", () => {
    store.rememberComposerIntent("post-1", "继续聊聊", {
      commentId: "reply-1",
      rootId: "root-1",
      user: { id: "user-1", nickName: "漫游者" },
    });

    expect(store.consumeComposerIntent("post-1")).toMatchObject({
      content: "继续聊聊",
      target: { commentId: "reply-1", rootId: "root-1" },
    });
    expect(store.consumeComposerIntent("post-1")).toBeNull();
  });
});
