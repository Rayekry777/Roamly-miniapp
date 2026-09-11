import type {
  PostDraft,
  SectionSummary,
  ShopSummary,
  UploadedMedia,
} from "../types";

const POST_DRAFT_KEY = "roamly_post_draft_v1";

function emptyDraft(): PostDraft {
  return {
    title: "",
    content: "",
    media: [],
    shopVisit: false,
    section: null,
    shop: null,
    submitting: false,
    updatedAt: 0,
  };
}

export class PostDraftStore {
  private draft = emptyDraft();

  restore(): PostDraft {
    const stored = wx.getStorageSync(POST_DRAFT_KEY) as string | PostDraft;
    if (!stored) return this.getState();

    try {
      const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
      this.draft = normalizeDraft(parsed as Partial<PostDraft>);
    } catch {
      wx.removeStorageSync(POST_DRAFT_KEY);
      this.draft = emptyDraft();
    }
    return this.getState();
  }

  getState(): PostDraft {
    return {
      ...this.draft,
      media: this.draft.media.map((item) => ({
        ...item,
        asset: item.asset ? { ...item.asset } : undefined,
      })),
      section: this.draft.section ? { ...this.draft.section } : null,
      shop: this.draft.shop ? { ...this.draft.shop } : null,
    };
  }

  updateText(field: "title" | "content", value: string): void {
    this.update({ [field]: value });
  }

  setShopVisit(shopVisit: boolean): void {
    this.update({
      shopVisit,
      ...(shopVisit ? {} : { section: null, shop: null }),
    });
  }

  selectSection(section: SectionSummary | null): void {
    this.update({ section });
  }

  selectShop(shop: ShopSummary | null): void {
    this.update({ shop });
  }

  addMedia(localPaths: string[]): UploadedMedia[] {
    const known = new Set(this.draft.media.map((item) => item.localPath));
    const added = localPaths
      .filter((path) => {
        if (!path || known.has(path)) return false;
        known.add(path);
        return true;
      })
      .slice(0, Math.max(0, 9 - this.draft.media.length))
      .map<UploadedMedia>((localPath) => ({
        localPath,
        status: "WAITING",
      }));
    if (added.length) this.update({ media: [...this.draft.media, ...added] });
    return added;
  }

  updateMedia(localPath: string, patch: Partial<UploadedMedia>): void {
    this.update({
      media: this.draft.media.map((item) =>
        item.localPath === localPath ? { ...item, ...patch } : item,
      ),
    });
  }

  replaceMedia(localPath: string, replacement: UploadedMedia): void {
    this.update({
      media: this.draft.media.map((item) =>
        item.localPath === localPath ? replacement : item,
      ),
    });
  }

  removeMedia(localPath: string): UploadedMedia | undefined {
    const removed = this.draft.media.find(
      (item) => item.localPath === localPath,
    );
    if (!removed) return undefined;
    this.update({
      media: this.draft.media.filter((item) => item.localPath !== localPath),
    });
    return {
      ...removed,
      asset: removed.asset ? { ...removed.asset } : undefined,
    };
  }

  moveMedia(localPath: string, direction: -1 | 1): void {
    const current = this.draft.media.findIndex(
      (item) => item.localPath === localPath,
    );
    const target = current + direction;
    if (current < 0 || target < 0 || target >= this.draft.media.length) return;

    const media = [...this.draft.media];
    [media[current], media[target]] = [media[target]!, media[current]!];
    this.update({ media });
  }

  setSubmitting(submitting: boolean): void {
    this.draft = { ...this.draft, submitting };
  }

  hasContent(): boolean {
    return Boolean(
      this.draft.title.trim() ||
      this.draft.content.trim() ||
      this.draft.media.length ||
      this.draft.shopVisit,
    );
  }

  clear(): void {
    this.draft = emptyDraft();
    wx.removeStorageSync(POST_DRAFT_KEY);
  }

  private update(patch: Partial<PostDraft>): void {
    this.draft = {
      ...this.draft,
      ...patch,
      submitting: false,
      updatedAt: Date.now(),
    };
    this.persist();
  }

  private persist(): void {
    const persisted = {
      title: this.draft.title,
      content: this.draft.content,
      media: this.draft.media,
      shopVisit: this.draft.shopVisit,
      section: this.draft.section,
      shop: this.draft.shop,
      updatedAt: this.draft.updatedAt,
    };
    wx.setStorageSync(POST_DRAFT_KEY, JSON.stringify(persisted));
  }
}

function normalizeDraft(value: Partial<PostDraft>): PostDraft {
  const media = Array.isArray(value.media)
    ? value.media
        .filter((item) => item && typeof item.localPath === "string")
        .slice(0, 9)
        .map((item) => ({
          ...item,
          status:
            item.status === "UPLOADING" || item.status === "WAITING"
              ? ("FAILED" as const)
              : item.status,
          error:
            item.status === "UPLOADING" || item.status === "WAITING"
              ? "上次上传未完成，请重试"
              : item.error,
        }))
    : [];

  return {
    title: typeof value.title === "string" ? value.title.slice(0, 120) : "",
    content:
      typeof value.content === "string" ? value.content.slice(0, 5000) : "",
    media,
    shopVisit: value.shopVisit === true,
    section: value.shopVisit === true && value.section ? value.section : null,
    shop: value.shopVisit === true && value.shop ? value.shop : null,
    submitting: false,
    updatedAt:
      typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : 0,
  };
}

export const postDraftStore = new PostDraftStore();
