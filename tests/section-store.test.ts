import { beforeEach, describe, expect, it, vi } from "vitest";
import { SectionStore } from "../miniprogram/store/section";
import type { PostCard, SectionSummary } from "../miniprogram/types";

function section(id: string, followedByMe: boolean): SectionSummary {
  return {
    id,
    code: `SECTION_${id}`,
    name: `分区 ${id}`,
    allowShopVisit: true,
    followedByMe,
  };
}

function post(id: string): PostCard {
  return {
    id,
    author: { id: `user-${id}`, nickName: `用户${id}` },
    section: section("1", false),
    contentPreview: `动态${id}`,
    media: [],
    shopVisit: false,
    likedCount: 0,
    commentCount: 0,
    likedByMe: false,
    followingAuthor: false,
    createdTime: "2026-09-02T12:00:00+08:00",
  };
}

describe("section store", () => {
  const storage = new Map<string, unknown>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("wx", {
      getStorageSync: (key: string) => storage.get(key) || "",
      setStorageSync: (key: string, value: unknown) => storage.set(key, value),
      removeStorageSync: (key: string) => storage.delete(key),
    });
  });

  it("places followed sections first while preserving platform order", () => {
    const store = new SectionStore();
    store.applyList([
      section("1", false),
      section("2", true),
      section("3", false),
      section("4", true),
    ]);

    expect(store.getListState().items.map((item) => item.id)).toEqual([
      "2",
      "4",
      "1",
      "3",
    ]);
  });

  it("rolls back optimistic following changes", () => {
    const store = new SectionStore();
    store.applyList([section("1", false), section("2", false)]);

    const rollback = store.optimisticallySetSectionFollowing("2", true);
    expect(store.getListState().items.map((item) => item.id)).toEqual([
      "2",
      "1",
    ]);

    rollback();
    expect(store.getListState().items).toEqual([
      section("1", false),
      section("2", false),
    ]);
  });

  it("consumes the intended section once after login", () => {
    const store = new SectionStore();
    store.rememberFollowIntent("9223372036854775807");

    expect(store.takeFollowIntent()).toBe("9223372036854775807");
    expect(store.takeFollowIntent()).toBeNull();
  });

  it("does not discard a detail-page intent when another section checks first", () => {
    const store = new SectionStore();
    store.rememberFollowIntent("section-2");

    expect(store.consumeFollowIntent("section-1")).toBe(false);
    expect(store.consumeFollowIntent("section-2")).toBe(true);
  });

  it("isolates latest and hot feeds by city and restores their scroll", () => {
    const store = new SectionStore();
    store.applyFeedPage(
      "1",
      "HANGZHOU",
      "LATEST",
      { items: [post("1")], nextCursor: 90, nextOffset: 1, hasMore: true },
      true,
    );
    store.applyFeedPage(
      "1",
      "HANGZHOU",
      "HOT",
      { items: [post("2")], nextCursor: 80, nextOffset: 2, hasMore: false },
      true,
    );
    store.applyFeedPage(
      "1",
      "SHANGHAI",
      "LATEST",
      { items: [post("3")], nextCursor: null, nextOffset: 0, hasMore: false },
      true,
    );
    store.setScrollTop("1", "HANGZHOU", "LATEST", 640);
    store.setScrollTop("1", "HANGZHOU", "HOT", 120);

    expect(store.getFeedState("1", "HANGZHOU", "LATEST")).toMatchObject({
      items: [{ id: "1" }],
      nextCursor: 90,
      nextOffset: 1,
      scrollTop: 640,
    });
    expect(store.getFeedState("1", "HANGZHOU", "HOT")).toMatchObject({
      items: [{ id: "2" }],
      nextCursor: 80,
      nextOffset: 2,
      scrollTop: 120,
    });
    expect(store.getFeedState("1", "SHANGHAI", "LATEST").items[0]?.id).toBe(
      "3",
    );
  });

  it("deduplicates cursor pages without converting large string ids", () => {
    const store = new SectionStore();
    store.applyFeedPage(
      "1",
      "HANGZHOU",
      "LATEST",
      {
        items: [post("9223372036854775807"), post("2")],
        nextCursor: 10,
        nextOffset: 0,
        hasMore: true,
      },
      true,
    );
    store.applyFeedPage(
      "1",
      "HANGZHOU",
      "LATEST",
      {
        items: [post("2"), post("3")],
        nextCursor: null,
        nextOffset: 0,
        hasMore: false,
      },
      false,
    );

    expect(
      store
        .getFeedState("1", "HANGZHOU", "LATEST")
        .items.map((item) => item.id),
    ).toEqual(["9223372036854775807", "2", "3"]);
  });
});
