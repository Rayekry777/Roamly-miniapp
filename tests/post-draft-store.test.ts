import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostDraftStore } from "../miniprogram/store/post-draft";

describe("post draft store", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("wx", {
      getStorageSync: (key: string) => storage.get(key) || "",
      setStorageSync: (key: string, value: string) => storage.set(key, value),
      removeStorageSync: (key: string) => storage.delete(key),
    });
  });

  it("clears hidden section and shop values when shop visit is disabled", () => {
    const store = new PostDraftStore();
    store.setShopVisit(true);
    store.selectSection({
      id: "section-1",
      code: "FOOD",
      name: "城市美食",
      allowShopVisit: true,
      followedByMe: false,
    });
    store.selectShop({ id: "shop-1", name: "漫游咖啡" });

    store.setShopVisit(false);

    expect(store.getState()).toMatchObject({
      shopVisit: false,
      section: null,
      shop: null,
    });
  });

  it("deduplicates media, limits it to nine and supports ordering", () => {
    const store = new PostDraftStore();
    store.addMedia([
      "1.jpg",
      "2.jpg",
      "2.jpg",
      "3.jpg",
      "4.jpg",
      "5.jpg",
      "6.jpg",
      "7.jpg",
      "8.jpg",
      "9.jpg",
      "10.jpg",
    ]);
    store.moveMedia("3.jpg", -1);

    expect(store.getState().media.map((item) => item.localPath)).toEqual([
      "1.jpg",
      "3.jpg",
      "2.jpg",
      "4.jpg",
      "5.jpg",
      "6.jpg",
      "7.jpg",
      "8.jpg",
      "9.jpg",
    ]);
  });

  it("restores persisted text and marks interrupted uploads as failed", () => {
    storage.set(
      "roamly_post_draft_v1",
      JSON.stringify({
        title: "草稿",
        content: "仍需继续编辑",
        media: [{ localPath: "temp.jpg", status: "UPLOADING" }],
        shopVisit: false,
        updatedAt: 100,
      }),
    );
    const store = new PostDraftStore();

    const restored = store.restore();

    expect(restored.title).toBe("草稿");
    expect(restored.media[0]).toMatchObject({
      status: "FAILED",
      error: "上次上传未完成，请重试",
    });
  });

  it("removes persisted data only after an explicit clear", () => {
    const store = new PostDraftStore();
    store.updateText("content", "今天沿河散步");
    expect(storage.has("roamly_post_draft_v1")).toBe(true);

    store.clear();

    expect(storage.has("roamly_post_draft_v1")).toBe(false);
    expect(store.hasContent()).toBe(false);
  });
});
