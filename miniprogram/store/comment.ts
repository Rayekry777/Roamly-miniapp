import type {
  CommentReplyTarget,
  CommentSort,
  CommentThread,
  CursorPageResult,
  PostComment,
} from "../types";

const COMPOSER_INTENT_KEY = "roamly_comment_composer_intent_v1";
const COMPOSER_INTENT_MAX_AGE = 10 * 60 * 1000;

export interface ComposerIntent {
  postId: string;
  content: string;
  target: CommentReplyTarget | null;
  createdAt: number;
}

export interface CommentThreadState extends CommentThread {
  id: string;
  expanded: boolean;
  repliesLoading: boolean;
}

export interface CommentListState {
  items: CommentThreadState[];
  nextCursor: number | null;
  nextOffset: number;
  hasMore: boolean;
  loading: boolean;
  refreshing: boolean;
  scrollTop: number;
  loadedAt: number;
}

const emptyListState = (): CommentListState => ({
  items: [],
  nextCursor: null,
  nextOffset: 0,
  hasMore: true,
  loading: false,
  refreshing: false,
  scrollTop: 0,
  loadedAt: 0,
});

export class CommentStore {
  private states = new Map<string, CommentListState>();

  getState(postId: string, sort: CommentSort): CommentListState {
    const state = this.ensureState(postId, sort);
    return {
      ...state,
      items: state.items.map(copyThread),
    };
  }

  shouldLoad(
    postId: string,
    sort: CommentSort,
    maxAge = 3 * 60 * 1000,
  ): boolean {
    const state = this.ensureState(postId, sort);
    return state.loadedAt === 0 || Date.now() - state.loadedAt > maxAge;
  }

  startLoading(postId: string, sort: CommentSort, refresh: boolean): boolean {
    const key = this.key(postId, sort);
    const state = this.ensureState(postId, sort);
    if (state.loading || state.refreshing) return false;
    if (!refresh && state.items.length > 0 && !state.hasMore) return false;
    this.states.set(key, {
      ...state,
      loading: !refresh,
      refreshing: refresh,
    });
    return true;
  }

  applyPage(
    postId: string,
    sort: CommentSort,
    page: CursorPageResult<CommentThread>,
    replace: boolean,
  ): void {
    const key = this.key(postId, sort);
    const state = this.ensureState(postId, sort);
    const current = replace ? [] : state.items;
    this.states.set(key, {
      ...state,
      items: mergeThreads(current, page.items),
      nextCursor: page.nextCursor,
      nextOffset: page.nextOffset,
      hasMore: page.hasMore,
      loading: false,
      refreshing: false,
      loadedAt: Date.now(),
    });
  }

  finishLoading(postId: string, sort: CommentSort): void {
    const key = this.key(postId, sort);
    const state = this.ensureState(postId, sort);
    this.states.set(key, { ...state, loading: false, refreshing: false });
  }

  setScrollTop(postId: string, sort: CommentSort, scrollTop: number): void {
    const key = this.key(postId, sort);
    const state = this.ensureState(postId, sort);
    this.states.set(key, { ...state, scrollTop: Math.max(0, scrollTop) });
  }

  appendRoot(postId: string, sort: CommentSort, comment: PostComment): void {
    const key = this.key(postId, sort);
    const state = this.ensureState(postId, sort);
    if (state.items.some((thread) => thread.root.id === comment.id)) return;
    const thread = toThreadState({
      root: comment,
      replies: [],
      replyCount: 0,
      hasMoreReplies: false,
      nextReplyCursor: null,
      nextReplyOffset: 0,
    });
    this.states.set(key, {
      ...state,
      items: [thread, ...state.items],
    });
  }

  appendReply(postId: string, rootId: string, reply: PostComment): void {
    this.mapPostStates(postId, (state) => ({
      ...state,
      items: state.items.map((thread) => {
        if (thread.root.id !== rootId) return thread;
        if (thread.replies.some((item) => item.id === reply.id)) return thread;
        return {
          ...thread,
          replies: [...thread.replies, reply],
          replyCount: thread.replyCount + 1,
          root: {
            ...thread.root,
            replyCount: thread.root.replyCount + 1,
          },
          expanded: true,
        };
      }),
    }));
  }

  startRepliesLoading(postId: string, rootId: string): boolean {
    let started = false;
    this.mapPostStates(postId, (state) => ({
      ...state,
      items: state.items.map((thread) => {
        if (thread.root.id !== rootId || thread.repliesLoading) return thread;
        started = true;
        return { ...thread, repliesLoading: true };
      }),
    }));
    return started;
  }

  applyRepliesPage(
    postId: string,
    rootId: string,
    page: CursorPageResult<PostComment>,
  ): void {
    this.mapPostStates(postId, (state) => ({
      ...state,
      items: state.items.map((thread) =>
        thread.root.id === rootId
          ? {
              ...thread,
              replies: mergeComments(thread.replies, page.items),
              nextReplyCursor: page.nextCursor,
              nextReplyOffset: page.nextOffset,
              hasMoreReplies: page.hasMore,
              expanded: true,
              repliesLoading: false,
            }
          : thread,
      ),
    }));
  }

  finishRepliesLoading(postId: string, rootId: string): void {
    this.mapPostStates(postId, (state) => ({
      ...state,
      items: state.items.map((thread) =>
        thread.root.id === rootId
          ? { ...thread, repliesLoading: false }
          : thread,
      ),
    }));
  }

  optimisticallySetLiked(
    postId: string,
    commentId: string,
    liked: boolean,
  ): () => void {
    const snapshots = this.copyPostStates(postId);
    this.mapPostStates(postId, (state) => ({
      ...state,
      items: state.items.map((thread) => ({
        ...thread,
        root: updateLiked(thread.root, commentId, liked),
        replies: thread.replies.map((reply) =>
          updateLiked(reply, commentId, liked),
        ),
      })),
    }));
    return () => this.restorePostStates(postId, snapshots);
  }

  applyDelete(postId: string, commentId: string): boolean {
    let found = false;
    this.mapPostStates(postId, (state) => ({
      ...state,
      items: state.items.flatMap((thread) => {
        if (thread.root.id === commentId) {
          found = true;
          if (thread.replyCount === 0) return [];
          return [
            {
              ...thread,
              root: {
                ...thread.root,
                content: "",
                status: "DELETED" as const,
              },
            },
          ];
        }
        const replies = thread.replies.filter((reply) => {
          if (reply.id !== commentId) return true;
          found = true;
          return false;
        });
        if (replies.length === thread.replies.length) return [thread];
        return [
          {
            ...thread,
            replies,
            replyCount: Math.max(0, thread.replyCount - 1),
            root: {
              ...thread.root,
              replyCount: Math.max(0, thread.root.replyCount - 1),
            },
          },
        ];
      }),
    }));
    return found;
  }

  contains(postId: string, sort: CommentSort, commentId: string): boolean {
    return this.ensureState(postId, sort).items.some(
      (thread) =>
        thread.root.id === commentId ||
        thread.replies.some((reply) => reply.id === commentId),
    );
  }

  rememberComposerIntent(
    postId: string,
    content: string,
    target: CommentReplyTarget | null,
  ): void {
    const intent: ComposerIntent = {
      postId,
      content,
      target,
      createdAt: Date.now(),
    };
    wx.setStorageSync(COMPOSER_INTENT_KEY, intent);
  }

  consumeComposerIntent(postId: string): ComposerIntent | null {
    const intent = wx.getStorageSync(COMPOSER_INTENT_KEY) as
      | ComposerIntent
      | "";
    if (!intent) return null;
    if (
      intent.postId !== postId ||
      Date.now() - intent.createdAt > COMPOSER_INTENT_MAX_AGE
    ) {
      if (Date.now() - intent.createdAt > COMPOSER_INTENT_MAX_AGE) {
        wx.removeStorageSync(COMPOSER_INTENT_KEY);
      }
      return null;
    }
    wx.removeStorageSync(COMPOSER_INTENT_KEY);
    return intent;
  }

  getThread(
    postId: string,
    sort: CommentSort,
    rootId: string,
  ): CommentThreadState | undefined {
    const thread = this.ensureState(postId, sort).items.find(
      (item) => item.root.id === rootId,
    );
    return thread ? copyThread(thread) : undefined;
  }

  clearPersonalization(): void {
    this.states.forEach((state, key) => {
      this.states.set(key, {
        ...state,
        items: state.items.map((thread) => ({
          ...thread,
          root: { ...thread.root, likedByMe: false },
          replies: thread.replies.map((reply) => ({
            ...reply,
            likedByMe: false,
          })),
        })),
      });
    });
  }

  private ensureState(postId: string, sort: CommentSort): CommentListState {
    const key = this.key(postId, sort);
    const existing = this.states.get(key);
    if (existing) return existing;
    const state = emptyListState();
    this.states.set(key, state);
    return state;
  }

  private key(postId: string, sort: CommentSort): string {
    return `${postId}:${sort}`;
  }

  private mapPostStates(
    postId: string,
    mapper: (state: CommentListState) => CommentListState,
  ): void {
    for (const sort of ["HOT", "LATEST"] as const) {
      const key = this.key(postId, sort);
      if (this.states.has(key)) {
        this.states.set(key, mapper(this.ensureState(postId, sort)));
      }
    }
  }

  private copyPostStates(postId: string): Map<CommentSort, CommentListState> {
    const snapshots = new Map<CommentSort, CommentListState>();
    for (const sort of ["HOT", "LATEST"] as const) {
      if (this.states.has(this.key(postId, sort))) {
        snapshots.set(sort, this.getState(postId, sort));
      }
    }
    return snapshots;
  }

  private restorePostStates(
    postId: string,
    snapshots: Map<CommentSort, CommentListState>,
  ): void {
    snapshots.forEach((state, sort) => {
      this.states.set(this.key(postId, sort), state);
    });
  }
}

function toThreadState(thread: CommentThread): CommentThreadState {
  return {
    ...thread,
    id: thread.root.id,
    replies: [...thread.replies],
    expanded: thread.replies.length > 0,
    repliesLoading: false,
  };
}

function copyThread(thread: CommentThreadState): CommentThreadState {
  return {
    ...thread,
    root: { ...thread.root },
    replies: thread.replies.map((reply) => ({ ...reply })),
  };
}

function mergeThreads(
  current: CommentThreadState[],
  incoming: CommentThread[],
): CommentThreadState[] {
  const byId = new Map(current.map((thread) => [thread.root.id, thread]));
  incoming.forEach((thread) => {
    const existing = byId.get(thread.root.id);
    byId.set(
      thread.root.id,
      existing
        ? {
            ...toThreadState(thread),
            replies: mergeComments(existing.replies, thread.replies),
            expanded: existing.expanded || thread.replies.length > 0,
          }
        : toThreadState(thread),
    );
  });
  return [...byId.values()];
}

function mergeComments(
  current: PostComment[],
  incoming: PostComment[],
): PostComment[] {
  const byId = new Map(current.map((comment) => [comment.id, comment]));
  incoming.forEach((comment) => byId.set(comment.id, comment));
  return [...byId.values()];
}

function updateLiked(
  comment: PostComment,
  commentId: string,
  liked: boolean,
): PostComment {
  if (comment.id !== commentId) return comment;
  return {
    ...comment,
    likedByMe: liked,
    likedCount: Math.max(
      0,
      comment.likedCount + (comment.likedByMe === liked ? 0 : liked ? 1 : -1),
    ),
  };
}

export const commentStore = new CommentStore();
