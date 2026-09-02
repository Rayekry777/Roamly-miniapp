import type { CursorPageResult, PostCard } from "../types";

export type HomeFeedMode = "RECOMMENDED" | "FOLLOWING";

export interface FeedState {
  items: PostCard[];
  nextCursor: number | null;
  nextOffset: number;
  hasMore: boolean;
  loading: boolean;
  refreshing: boolean;
  scrollTop: number;
  loadedAt: number;
}

const EMPTY_FEED_STATE = (): FeedState => ({
  items: [],
  nextCursor: null,
  nextOffset: 0,
  hasMore: true,
  loading: false,
  refreshing: false,
  scrollTop: 0,
  loadedAt: 0,
});

export class FeedStore {
  private mode: HomeFeedMode = "RECOMMENDED";
  private feeds: Record<HomeFeedMode, FeedState> = {
    RECOMMENDED: EMPTY_FEED_STATE(),
    FOLLOWING: EMPTY_FEED_STATE(),
  };

  getMode(): HomeFeedMode {
    return this.mode;
  }

  setMode(mode: HomeFeedMode): void {
    this.mode = mode;
  }

  getState(mode: HomeFeedMode): FeedState {
    const state = this.feeds[mode];
    return { ...state, items: [...state.items] };
  }

  shouldLoad(mode: HomeFeedMode, maxAge = 5 * 60 * 1000): boolean {
    const state = this.feeds[mode];
    return state.loadedAt === 0 || Date.now() - state.loadedAt > maxAge;
  }

  startLoading(mode: HomeFeedMode, refresh: boolean): boolean {
    const state = this.feeds[mode];
    if (state.loading || state.refreshing) return false;
    if (!refresh && state.items.length > 0 && !state.hasMore) return false;

    this.feeds[mode] = {
      ...state,
      loading: !refresh,
      refreshing: refresh,
    };
    return true;
  }

  applyPage(
    mode: HomeFeedMode,
    page: CursorPageResult<PostCard>,
    replace: boolean,
  ): void {
    const state = this.feeds[mode];
    const items = mergePosts(replace ? [] : state.items, page.items);
    this.feeds[mode] = {
      ...state,
      items,
      nextCursor: page.nextCursor,
      nextOffset: page.nextOffset,
      hasMore: page.hasMore,
      loading: false,
      refreshing: false,
      loadedAt: Date.now(),
    };
  }

  finishLoading(mode: HomeFeedMode): void {
    const state = this.feeds[mode];
    this.feeds[mode] = {
      ...state,
      loading: false,
      refreshing: false,
    };
  }

  setScrollTop(mode: HomeFeedMode, scrollTop: number): void {
    this.feeds[mode] = {
      ...this.feeds[mode],
      scrollTop: Math.max(0, scrollTop),
    };
  }

  optimisticallySetLiked(postId: string, liked: boolean): () => void {
    const previous = this.capturePostFields(postId, [
      "likedByMe",
      "likedCount",
    ]);
    this.mapPosts((post) =>
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
    return () => this.restorePostFields(previous);
  }

  optimisticallySetFollowing(authorId: string, following: boolean): () => void {
    const previous = this.capturePostFieldsByAuthor(authorId, [
      "followingAuthor",
    ]);
    this.mapPosts((post) =>
      post.author.id === authorId
        ? { ...post, followingAuthor: following }
        : post,
    );
    return () => this.restorePostFields(previous);
  }

  adjustPostCommentCount(postId: string, delta: number): void {
    this.mapPosts((post) =>
      post.id === postId
        ? { ...post, commentCount: Math.max(0, post.commentCount + delta) }
        : post,
    );
  }

  clearFollowingAndPersonalization(): void {
    this.feeds.FOLLOWING = EMPTY_FEED_STATE();
    this.feeds.RECOMMENDED = {
      ...this.feeds.RECOMMENDED,
      items: this.feeds.RECOMMENDED.items.map((post) => ({
        ...post,
        likedByMe: false,
        followingAuthor: false,
        section: { ...post.section, followedByMe: false },
      })),
    };
    this.mode = "RECOMMENDED";
  }

  resetFeed(mode: HomeFeedMode): void {
    this.feeds[mode] = EMPTY_FEED_STATE();
  }

  reset(): void {
    this.mode = "RECOMMENDED";
    this.feeds = {
      RECOMMENDED: EMPTY_FEED_STATE(),
      FOLLOWING: EMPTY_FEED_STATE(),
    };
  }

  private mapPosts(mapper: (post: PostCard) => PostCard): void {
    for (const mode of ["RECOMMENDED", "FOLLOWING"] as const) {
      this.feeds[mode] = {
        ...this.feeds[mode],
        items: this.feeds[mode].items.map(mapper),
      };
    }
  }

  private capturePostFields(
    postId: string,
    fields: Array<keyof PostCard>,
  ): PostFieldSnapshot[] {
    return this.captureFields((post) => post.id === postId, fields);
  }

  private capturePostFieldsByAuthor(
    authorId: string,
    fields: Array<keyof PostCard>,
  ): PostFieldSnapshot[] {
    return this.captureFields((post) => post.author.id === authorId, fields);
  }

  private captureFields(
    predicate: (post: PostCard) => boolean,
    fields: Array<keyof PostCard>,
  ): PostFieldSnapshot[] {
    const snapshots: PostFieldSnapshot[] = [];
    for (const mode of ["RECOMMENDED", "FOLLOWING"] as const) {
      this.feeds[mode].items.forEach((post) => {
        if (!predicate(post)) return;
        const values: Partial<PostCard> = {};
        fields.forEach((field) => {
          Object.assign(values, { [field]: post[field] });
        });
        snapshots.push({ mode, postId: post.id, values });
      });
    }
    return snapshots;
  }

  private restorePostFields(snapshots: PostFieldSnapshot[]): void {
    for (const snapshot of snapshots) {
      this.feeds[snapshot.mode] = {
        ...this.feeds[snapshot.mode],
        items: this.feeds[snapshot.mode].items.map((post) =>
          post.id === snapshot.postId ? { ...post, ...snapshot.values } : post,
        ),
      };
    }
  }
}

interface PostFieldSnapshot {
  mode: HomeFeedMode;
  postId: string;
  values: Partial<PostCard>;
}

export function mergePosts(
  current: PostCard[],
  incoming: PostCard[],
): PostCard[] {
  const byId = new Map(current.map((post) => [post.id, post]));
  incoming.forEach((post) => byId.set(post.id, post));
  return [...byId.values()];
}

export const feedStore = new FeedStore();
