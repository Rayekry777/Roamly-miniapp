import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedStore, mergePosts } from "../miniprogram/store/feed";
import type { PostCard } from "../miniprogram/types";

function post(id: string, options: Partial<PostCard> = {}): PostCard {
  return {
    id,
    author: { id: `user-${id}`, nickName: `用户${id}` },
    section: {
      id: "section-1",
      code: "ROAM_DAILY",
      name: "漫游日常",
      allowShopVisit: false,
      followedByMe: false,
    },
    contentPreview: `动态${id}`,
    media: [],
    shopVisit: false,
    likedCount: 0,
    commentCount: 0,
    likedByMe: false,
    followingAuthor: false,
    createdTime: "2026-09-02T12:00:00+08:00",
    ...options,
  };
}

describe("feed store", () => {
  let store: FeedStore;

  beforeEach(() => {
    store = new FeedStore();
    vi.useRealTimers();
  });

  it("keeps recommended and following cursor state isolated", () => {
    store.applyPage(
      "RECOMMENDED",
      {
        items: [post("1")],
        nextCursor: 100,
        nextOffset: 2,
        hasMore: true,
      },
      true,
    );
    store.applyPage(
      "FOLLOWING",
      {
        items: [post("2")],
        nextCursor: 80,
        nextOffset: 1,
        hasMore: false,
      },
      true,
    );
    store.setScrollTop("RECOMMENDED", 640);
    store.setScrollTop("FOLLOWING", 120);

    expect(store.getState("RECOMMENDED")).toMatchObject({
      items: [{ id: "1" }],
      nextCursor: 100,
      nextOffset: 2,
      hasMore: true,
      scrollTop: 640,
    });
    expect(store.getState("FOLLOWING")).toMatchObject({
      items: [{ id: "2" }],
      nextCursor: 80,
      nextOffset: 1,
      hasMore: false,
      scrollTop: 120,
    });
  });

  it("merges cursor pages by string post id", () => {
    const merged = mergePosts(
      [post("9223372036854775807"), post("2")],
      [post("2", { likedCount: 9 }), post("3")],
    );

    expect(merged.map((item) => item.id)).toEqual([
      "9223372036854775807",
      "2",
      "3",
    ]);
    expect(merged[1]?.likedCount).toBe(9);
  });

  it("caches a valid empty page instead of requesting it on every return", () => {
    store.applyPage(
      "RECOMMENDED",
      {
        items: [],
        nextCursor: null,
        nextOffset: 0,
        hasMore: false,
      },
      true,
    );

    expect(store.shouldLoad("RECOMMENDED")).toBe(false);
  });

  it("rolls an optimistic like back in both feeds", () => {
    const shared = post("1", { likedCount: 4 });
    const page = {
      items: [shared],
      nextCursor: null,
      nextOffset: 0,
      hasMore: false,
    };
    store.applyPage("RECOMMENDED", page, true);
    store.applyPage("FOLLOWING", page, true);

    const rollback = store.optimisticallySetLiked("1", true);
    expect(store.getState("RECOMMENDED").items[0]).toMatchObject({
      likedByMe: true,
      likedCount: 5,
    });
    expect(store.getState("FOLLOWING").items[0]).toMatchObject({
      likedByMe: true,
      likedCount: 5,
    });

    rollback();
    expect(store.getState("RECOMMENDED").items[0]).toMatchObject({
      likedByMe: false,
      likedCount: 4,
    });
    expect(store.getState("FOLLOWING").items[0]).toMatchObject({
      likedByMe: false,
      likedCount: 4,
    });
  });

  it("updates all cards by one author and restores them on failure", () => {
    const sameAuthor = { id: "author-1", nickName: "漫游者" };
    store.applyPage(
      "RECOMMENDED",
      {
        items: [post("1", { author: sameAuthor })],
        nextCursor: null,
        nextOffset: 0,
        hasMore: false,
      },
      true,
    );
    store.applyPage(
      "FOLLOWING",
      {
        items: [post("2", { author: sameAuthor })],
        nextCursor: null,
        nextOffset: 0,
        hasMore: false,
      },
      true,
    );

    const rollback = store.optimisticallySetFollowing("author-1", true);
    expect(store.getState("RECOMMENDED").items[0]?.followingAuthor).toBe(true);
    expect(store.getState("FOLLOWING").items[0]?.followingAuthor).toBe(true);

    rollback();
    expect(store.getState("RECOMMENDED").items[0]?.followingAuthor).toBe(false);
    expect(store.getState("FOLLOWING").items[0]?.followingAuthor).toBe(false);
  });

  it("clears private feed and personalization after logout", () => {
    const personalized = post("1", {
      likedByMe: true,
      followingAuthor: true,
      section: {
        id: "section-1",
        code: "ROAM_DAILY",
        name: "漫游日常",
        allowShopVisit: false,
        followedByMe: true,
      },
    });
    const page = {
      items: [personalized],
      nextCursor: null,
      nextOffset: 0,
      hasMore: false,
    };
    store.applyPage("RECOMMENDED", page, true);
    store.applyPage("FOLLOWING", page, true);
    store.setMode("FOLLOWING");

    store.clearFollowingAndPersonalization();

    expect(store.getMode()).toBe("RECOMMENDED");
    expect(store.getState("FOLLOWING").items).toEqual([]);
    expect(store.getState("RECOMMENDED").items[0]).toMatchObject({
      likedByMe: false,
      followingAuthor: false,
      section: { followedByMe: false },
    });
  });
});
