import type {
  CursorPageResult,
  PostCard,
  SectionDetail,
  SectionPostSort,
  SectionSummary,
} from "../types";
import { mergePosts } from "./feed";

const FOLLOW_INTENT_KEY = "roamly_section_follow_intent_v1";
const FOLLOW_INTENT_MAX_AGE = 10 * 60 * 1000;

export interface SectionListState {
  items: SectionSummary[];
  loading: boolean;
  refreshing: boolean;
  loadedAt: number;
}

export interface SectionFeedState {
  items: PostCard[];
  nextCursor: number | null;
  nextOffset: number;
  hasMore: boolean;
  loading: boolean;
  refreshing: boolean;
  scrollTop: number;
  loadedAt: number;
}

interface FollowIntent {
  sectionId: string;
  createdAt: number;
}

const emptyFeedState = (): SectionFeedState => ({
  items: [],
  nextCursor: null,
  nextOffset: 0,
  hasMore: true,
  loading: false,
  refreshing: false,
  scrollTop: 0,
  loadedAt: 0,
});

export class SectionStore {
  private list: SectionListState = {
    items: [],
    loading: false,
    refreshing: false,
    loadedAt: 0,
  };
  private details = new Map<string, SectionDetail>();
  private detailLoadedAt = new Map<string, number>();
  private feeds = new Map<string, SectionFeedState>();
  private activeSort = new Map<string, SectionPostSort>();
  private platformOrder = new Map<string, number>();

  getListState(): SectionListState {
    return { ...this.list, items: [...this.list.items] };
  }

  shouldLoadList(maxAge = 5 * 60 * 1000): boolean {
    return this.list.loadedAt === 0 || Date.now() - this.list.loadedAt > maxAge;
  }

  startListLoading(refresh: boolean): boolean {
    if (this.list.loading || this.list.refreshing) return false;
    this.list = {
      ...this.list,
      loading: !refresh,
      refreshing: refresh,
    };
    return true;
  }

  applyList(items: SectionSummary[]): void {
    this.platformOrder.clear();
    items.forEach((section, index) => {
      this.platformOrder.set(section.id, index);
    });
    this.list = {
      items: this.orderSections(items),
      loading: false,
      refreshing: false,
      loadedAt: Date.now(),
    };
  }

  finishListLoading(): void {
    this.list = { ...this.list, loading: false, refreshing: false };
  }

  getDetail(sectionId: string): SectionDetail | undefined {
    const detail = this.details.get(sectionId);
    return detail ? { ...detail } : undefined;
  }

  shouldLoadDetail(sectionId: string, maxAge = 5 * 60 * 1000): boolean {
    const loadedAt = this.detailLoadedAt.get(sectionId) || 0;
    return loadedAt === 0 || Date.now() - loadedAt > maxAge;
  }

  applyDetail(detail: SectionDetail): void {
    this.details.set(detail.id, { ...detail });
    this.detailLoadedAt.set(detail.id, Date.now());
  }

  getActiveSort(sectionId: string): SectionPostSort {
    return this.activeSort.get(sectionId) || "LATEST";
  }

  setActiveSort(sectionId: string, sort: SectionPostSort): void {
    this.activeSort.set(sectionId, sort);
  }

  getFeedState(
    sectionId: string,
    cityCode: string,
    sort: SectionPostSort,
  ): SectionFeedState {
    const state = this.ensureFeed(sectionId, cityCode, sort);
    return { ...state, items: [...state.items] };
  }

  shouldLoadFeed(
    sectionId: string,
    cityCode: string,
    sort: SectionPostSort,
    maxAge = 5 * 60 * 1000,
  ): boolean {
    const state = this.ensureFeed(sectionId, cityCode, sort);
    return state.loadedAt === 0 || Date.now() - state.loadedAt > maxAge;
  }

  startFeedLoading(
    sectionId: string,
    cityCode: string,
    sort: SectionPostSort,
    refresh: boolean,
  ): boolean {
    const key = this.feedKey(sectionId, cityCode, sort);
    const state = this.ensureFeed(sectionId, cityCode, sort);
    if (state.loading || state.refreshing) return false;
    if (!refresh && state.items.length > 0 && !state.hasMore) return false;
    this.feeds.set(key, {
      ...state,
      loading: !refresh,
      refreshing: refresh,
    });
    return true;
  }

  applyFeedPage(
    sectionId: string,
    cityCode: string,
    sort: SectionPostSort,
    page: CursorPageResult<PostCard>,
    replace: boolean,
  ): void {
    const key = this.feedKey(sectionId, cityCode, sort);
    const state = this.ensureFeed(sectionId, cityCode, sort);
    this.feeds.set(key, {
      ...state,
      items: mergePosts(replace ? [] : state.items, page.items),
      nextCursor: page.nextCursor,
      nextOffset: page.nextOffset,
      hasMore: page.hasMore,
      loading: false,
      refreshing: false,
      loadedAt: Date.now(),
    });
  }

  finishFeedLoading(
    sectionId: string,
    cityCode: string,
    sort: SectionPostSort,
  ): void {
    const key = this.feedKey(sectionId, cityCode, sort);
    const state = this.ensureFeed(sectionId, cityCode, sort);
    this.feeds.set(key, { ...state, loading: false, refreshing: false });
  }

  setScrollTop(
    sectionId: string,
    cityCode: string,
    sort: SectionPostSort,
    scrollTop: number,
  ): void {
    const key = this.feedKey(sectionId, cityCode, sort);
    const state = this.ensureFeed(sectionId, cityCode, sort);
    this.feeds.set(key, { ...state, scrollTop: Math.max(0, scrollTop) });
  }

  optimisticallySetSectionFollowing(
    sectionId: string,
    followed: boolean,
  ): () => void {
    const listSnapshot = this.getListState();
    const detailSnapshot = this.getDetail(sectionId);
    const feedSnapshots = new Map(
      [...this.feeds].map(([key, state]) => [
        key,
        { ...state, items: [...state.items] },
      ]),
    );

    this.list = {
      ...this.list,
      items: this.orderSections(
        this.list.items.map((section) =>
          section.id === sectionId
            ? { ...section, followedByMe: followed }
            : section,
        ),
      ),
    };
    const detail = this.details.get(sectionId);
    if (detail) {
      this.details.set(sectionId, {
        ...detail,
        followedByMe: followed,
        followerCount:
          detail.followerCount === undefined
            ? undefined
            : Math.max(
                0,
                detail.followerCount +
                  (detail.followedByMe === followed ? 0 : followed ? 1 : -1),
              ),
      });
    }
    this.mapFeedPosts((post) =>
      post.section.id === sectionId
        ? {
            ...post,
            section: { ...post.section, followedByMe: followed },
          }
        : post,
    );

    return () => {
      this.list = listSnapshot;
      if (detailSnapshot) this.details.set(sectionId, detailSnapshot);
      else this.details.delete(sectionId);
      this.feeds = feedSnapshots;
    };
  }

  optimisticallySetPostLiked(postId: string, liked: boolean): () => void {
    const snapshots = this.copyFeeds();
    this.mapFeedPosts((post) =>
      post.id === postId
        ? {
            ...post,
            likedByMe: liked,
            likedCount: Math.max(
              0,
              post.likedCount + (post.likedByMe === liked ? 0 : liked ? 1 : -1),
            ),
          }
        : post,
    );
    return () => {
      this.feeds = snapshots;
    };
  }

  optimisticallySetAuthorFollowing(
    authorId: string,
    followed: boolean,
  ): () => void {
    const snapshots = this.copyFeeds();
    this.mapFeedPosts((post) =>
      post.author.id === authorId
        ? { ...post, followingAuthor: followed }
        : post,
    );
    return () => {
      this.feeds = snapshots;
    };
  }

  rememberFollowIntent(sectionId: string): void {
    const intent: FollowIntent = { sectionId, createdAt: Date.now() };
    wx.setStorageSync(FOLLOW_INTENT_KEY, intent);
  }

  takeFollowIntent(): string | null {
    const intent = wx.getStorageSync(FOLLOW_INTENT_KEY) as FollowIntent | "";
    wx.removeStorageSync(FOLLOW_INTENT_KEY);
    if (!intent || Date.now() - intent.createdAt > FOLLOW_INTENT_MAX_AGE) {
      return null;
    }
    return intent.sectionId;
  }

  consumeFollowIntent(sectionId: string): boolean {
    const intent = wx.getStorageSync(FOLLOW_INTENT_KEY) as FollowIntent | "";
    if (!intent || Date.now() - intent.createdAt > FOLLOW_INTENT_MAX_AGE) {
      wx.removeStorageSync(FOLLOW_INTENT_KEY);
      return false;
    }
    if (intent.sectionId !== sectionId) return false;
    wx.removeStorageSync(FOLLOW_INTENT_KEY);
    return true;
  }

  clearPersonalization(): void {
    this.list = {
      ...this.list,
      items: this.orderSections(
        this.list.items.map((section) => ({
          ...section,
          followedByMe: false,
        })),
      ),
    };
    this.details.forEach((detail, id) => {
      this.details.set(id, { ...detail, followedByMe: false });
    });
    this.mapFeedPosts((post) => ({
      ...post,
      likedByMe: false,
      followingAuthor: false,
      section: { ...post.section, followedByMe: false },
    }));
  }

  private ensureFeed(
    sectionId: string,
    cityCode: string,
    sort: SectionPostSort,
  ): SectionFeedState {
    const key = this.feedKey(sectionId, cityCode, sort);
    const existing = this.feeds.get(key);
    if (existing) return existing;
    const state = emptyFeedState();
    this.feeds.set(key, state);
    return state;
  }

  private feedKey(
    sectionId: string,
    cityCode: string,
    sort: SectionPostSort,
  ): string {
    return `${sectionId}:${cityCode || "ALL"}:${sort}`;
  }

  private orderSections(items: SectionSummary[]): SectionSummary[] {
    return [...items].sort((left, right) => {
      if (left.followedByMe !== right.followedByMe) {
        return left.followedByMe ? -1 : 1;
      }
      return (
        (this.platformOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (this.platformOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      );
    });
  }

  private mapFeedPosts(mapper: (post: PostCard) => PostCard): void {
    this.feeds.forEach((state, key) => {
      this.feeds.set(key, { ...state, items: state.items.map(mapper) });
    });
  }

  private copyFeeds(): Map<string, SectionFeedState> {
    return new Map(
      [...this.feeds].map(([key, state]) => [
        key,
        { ...state, items: [...state.items] },
      ]),
    );
  }
}

export const sectionStore = new SectionStore();
