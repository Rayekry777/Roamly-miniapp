import {
  loadReplies,
  loadRootComments,
  removeComment,
  setCommentLiked,
  submitReply,
  submitRootComment,
  validateCommentContent,
} from "../../../services/comment";
import { setAuthorFollowing, setPostLiked } from "../../../services/feed";
import { loadPostDetail } from "../../../services/post";
import { authStore } from "../../../store/auth";
import { commentStore } from "../../../store/comment";
import { feedStore } from "../../../store/feed";
import { sectionStore } from "../../../store/section";
import type {
  CommentReplyTarget,
  CommentSort,
  CommentThread,
  PostDetail,
} from "../../../types";
import { navigateToLogin, requireLogin } from "../../../utils/navigation";
import {
  postDetailUrl,
  sectionDetailUrl,
  shopDetailUrl,
  userProfileUrl,
} from "../../../utils/routes";
import { createRequestScope } from "../../../utils/scope";
import { formatRelativeTime } from "../../../utils/time";

const COMMENT_PAGE_SIZE = 10;
const MAX_FOCUS_PAGES = 3;

Page({
  data: {
    post: null as PostDetail | null,
    displayTime: "",
    loading: true,
    error: "",
    commentSort: "HOT" as CommentSort,
    commentThreads: [] as CommentThread[],
    commentsLoading: false,
    commentsRefreshing: false,
    commentsHasMore: true,
    commentsError: "",
    focusCommentId: "",
    highlightedCommentId: "",
    replyTarget: null as CommentReplyTarget | null,
    composerDraft: "",
    composerFocusToken: 0,
    composerResetToken: 0,
    submittingComment: false,
    likingPost: false,
    followingAuthor: false,
    likingCommentIds: {} as Record<string, boolean>,
    deletingCommentIds: {} as Record<string, boolean>,
    currentUserId: authStore.user?.id || "",
  },
  onLoad(options: Record<string, string | undefined>) {
    this.postId = String(options.id || "");
    this.scope = createRequestScope();
    this.setData({
      focusCommentId: String(options.focusCommentId || ""),
      composerFocusToken: options.focusComposer === "1" ? 1 : 0,
    });
    if (!this.postId) {
      this.setData({ loading: false, error: "动态参数无效" });
      return;
    }
    void this.initializePage();
  },
  onShow() {
    const loggedIn = authStore.isLoggedIn();
    const sessionChanged = this.lastLoggedIn !== loggedIn;
    this.lastLoggedIn = loggedIn;
    this.setData({ currentUserId: authStore.user?.id || "" });
    if (loggedIn) this.restoreComposerIntent();
    if (this.initialized && sessionChanged) {
      void Promise.all([this.loadPost(), this.loadComments(true)]);
    }
  },
  onUnload() {
    this.scope?.close();
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
  },
  onPageScroll(event: WechatMiniprogram.Page.IPageScrollOption) {
    if (!this.postId) return;
    commentStore.setScrollTop(
      this.postId,
      this.data.commentSort,
      event.scrollTop,
    );
  },
  onReachBottom() {
    const state = commentStore.getState(this.postId, this.data.commentSort);
    if (state.hasMore && !state.loading && !state.refreshing) {
      void this.loadComments();
    }
  },
  onPullDownRefresh() {
    void this.refreshPage();
  },
  async initializePage() {
    const loaded = await this.loadPost();
    if (!loaded) return;
    const post = this.data.post;
    if (post) {
      this.setData({ commentSort: post.defaultCommentSort });
    }
    this.syncComments();
    if (commentStore.shouldLoad(this.postId, this.data.commentSort)) {
      await this.loadComments();
    }
    this.initialized = true;
    this.restoreComposerIntent();
    if (this.data.focusCommentId) await this.locateFocusedComment();
    else this.restoreCommentScroll();
  },
  async refreshPage() {
    try {
      await Promise.all([this.loadPost(), this.loadComments(true)]);
    } finally {
      wx.stopPullDownRefresh();
    }
  },
  async loadPost(): Promise<boolean> {
    this.setData({ error: "" });
    try {
      const post = await this.scope?.run(loadPostDetail(this.postId));
      if (!post) return false;
      this.setData({
        post,
        displayTime: formatRelativeTime(post.createdTime),
        loading: false,
      });
      return true;
    } catch (error) {
      this.setData({
        loading: false,
        error: this.errorMessage(error, "动态加载失败"),
      });
      return false;
    }
  },
  async loadComments(refresh = false): Promise<boolean> {
    const sort = this.data.commentSort;
    if (!commentStore.startLoading(this.postId, sort, refresh)) return false;
    this.setData({ commentsError: "" });
    this.syncComments();
    try {
      const current = commentStore.getState(this.postId, sort);
      const page = await this.scope?.run(
        loadRootComments(this.postId, {
          sort,
          cursor:
            !refresh && current.items.length > 0
              ? (current.nextCursor ?? undefined)
              : undefined,
          offset:
            !refresh && current.items.length > 0
              ? current.nextOffset
              : undefined,
          size: COMMENT_PAGE_SIZE,
        }),
      );
      if (!page) return false;
      commentStore.applyPage(this.postId, sort, page, refresh);
      return true;
    } catch (error) {
      this.setData({
        commentsError: this.errorMessage(error, "评论加载失败"),
      });
      return false;
    } finally {
      commentStore.finishLoading(this.postId, sort);
      this.syncComments();
    }
  },
  async locateFocusedComment() {
    const commentId = this.data.focusCommentId;
    if (this.data.commentsError) {
      wx.showToast({ title: "该评论暂不可查看", icon: "none" });
      this.scrollToComments();
      return;
    }
    let requestedPages = 1;
    while (
      !commentStore.contains(this.postId, this.data.commentSort, commentId) &&
      commentStore.getState(this.postId, this.data.commentSort).hasMore &&
      requestedPages < MAX_FOCUS_PAGES
    ) {
      const loaded = await this.loadComments();
      if (!loaded) break;
      requestedPages += 1;
    }

    if (commentStore.contains(this.postId, this.data.commentSort, commentId)) {
      this.scrollToComment(commentId);
      return;
    }
    wx.showToast({ title: "该评论暂不可查看", icon: "none" });
    this.scrollToComments();
  },
  switchCommentSort(event: WechatMiniprogram.TouchEvent) {
    const sort = String(event.currentTarget.dataset.sort) as CommentSort;
    if (
      sort === this.data.commentSort ||
      (sort !== "HOT" && sort !== "LATEST")
    ) {
      return;
    }
    this.setData({ commentSort: sort, commentsError: "" });
    this.syncComments();
    this.restoreCommentScroll();
    if (commentStore.shouldLoad(this.postId, sort)) void this.loadComments();
  },
  retryPost() {
    this.setData({ loading: true, error: "" });
    void this.initializePage();
  },
  retryComments() {
    void this.loadComments(true);
  },
  openAuthor() {
    if (this.data.post) {
      wx.navigateTo({ url: userProfileUrl(this.data.post.author.id) });
    }
  },
  openSection() {
    if (this.data.post) {
      wx.navigateTo({ url: sectionDetailUrl(this.data.post.section.id) });
    }
  },
  openShop(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: shopDetailUrl(event.detail.id) });
  },
  async togglePostLike() {
    const post = this.data.post;
    if (!post || this.data.likingPost) return;
    if (!requireLogin(postDetailUrl(this.postId))) return;
    const liked = !post.likedByMe;
    const feedRollback = feedStore.optimisticallySetLiked(this.postId, liked);
    const sectionRollback = sectionStore.optimisticallySetPostLiked(
      this.postId,
      liked,
    );
    this.setData({
      likingPost: true,
      post: {
        ...post,
        likedByMe: liked,
        likedCount: Math.max(0, post.likedCount + (liked ? 1 : -1)),
      },
    });
    try {
      await setPostLiked(this.postId, liked);
    } catch {
      feedRollback();
      sectionRollback();
      this.setData({ post });
    } finally {
      this.setData({ likingPost: false });
    }
  },
  async toggleAuthorFollow() {
    const post = this.data.post;
    if (!post || this.data.followingAuthor) return;
    if (!requireLogin(postDetailUrl(this.postId))) return;
    const followed = !post.followingAuthor;
    const feedRollback = feedStore.optimisticallySetFollowing(
      post.author.id,
      followed,
    );
    const sectionRollback = sectionStore.optimisticallySetAuthorFollowing(
      post.author.id,
      followed,
    );
    this.setData({
      followingAuthor: true,
      post: { ...post, followingAuthor: followed },
    });
    try {
      await setAuthorFollowing(post.author.id, followed);
    } catch {
      feedRollback();
      sectionRollback();
      this.setData({ post });
    } finally {
      this.setData({ followingAuthor: false });
    }
  },
  beginRootComment() {
    this.setData({
      replyTarget: null,
      composerFocusToken: this.data.composerFocusToken + 1,
    });
  },
  beginReply(event: WechatMiniprogram.CustomEvent<CommentReplyTarget>) {
    this.setData({
      replyTarget: event.detail,
      composerFocusToken: this.data.composerFocusToken + 1,
    });
  },
  cancelReply() {
    this.setData({ replyTarget: null });
  },
  async submitComment(
    event: WechatMiniprogram.CustomEvent<{ content: string }>,
  ) {
    if (this.data.submittingComment) return;
    let content: string;
    try {
      content = validateCommentContent(event.detail.content);
    } catch (error) {
      wx.showToast({
        title: this.errorMessage(error, "评论内容无效"),
        icon: "none",
      });
      return;
    }
    if (!authStore.isLoggedIn()) {
      commentStore.rememberComposerIntent(
        this.postId,
        content,
        this.data.replyTarget,
      );
      navigateToLogin(postDetailUrl(this.postId, { focusComposer: true }));
      return;
    }

    this.setData({ submittingComment: true });
    try {
      if (this.data.replyTarget) {
        const target = this.data.replyTarget;
        const reply = await submitReply(target.commentId, content);
        commentStore.appendReply(this.postId, target.rootId, reply);
      } else {
        const comment = await submitRootComment(this.postId, content);
        commentStore.appendRoot(this.postId, this.data.commentSort, comment);
      }
      this.adjustCommentCount(1);
      this.setData({
        replyTarget: null,
        composerDraft: "",
        composerResetToken: this.data.composerResetToken + 1,
      });
      this.syncComments();
      wx.showToast({ title: "发送成功", icon: "success" });
    } catch (error) {
      if (this.isUnauthorized(error)) {
        commentStore.rememberComposerIntent(
          this.postId,
          content,
          this.data.replyTarget,
        );
      }
      wx.showToast({
        title: this.errorMessage(error, "发送失败，请稍后重试"),
        icon: "none",
      });
    } finally {
      this.setData({ submittingComment: false });
    }
  },
  async loadMoreReplies(
    event: WechatMiniprogram.CustomEvent<{ rootId: string }>,
  ) {
    const rootId = event.detail.rootId;
    const thread = commentStore.getThread(
      this.postId,
      this.data.commentSort,
      rootId,
    );
    if (!thread || !commentStore.startRepliesLoading(this.postId, rootId)) {
      return;
    }
    this.syncComments();
    try {
      const page = await this.scope?.run(
        loadReplies(rootId, {
          cursor: thread.replies.length
            ? (thread.nextReplyCursor ?? undefined)
            : undefined,
          offset: thread.replies.length ? thread.nextReplyOffset : undefined,
          size: 20,
        }),
      );
      if (page) commentStore.applyRepliesPage(this.postId, rootId, page);
    } catch (error) {
      wx.showToast({
        title: this.errorMessage(error, "回复加载失败"),
        icon: "none",
      });
    } finally {
      commentStore.finishRepliesLoading(this.postId, rootId);
      this.syncComments();
    }
  },
  async toggleCommentLike(
    event: WechatMiniprogram.CustomEvent<{ id: string; liked: boolean }>,
  ) {
    if (!requireLogin(postDetailUrl(this.postId))) return;
    const { id, liked } = event.detail;
    if (this.data.likingCommentIds[id]) return;
    const rollback = commentStore.optimisticallySetLiked(
      this.postId,
      id,
      liked,
    );
    this.setCommentOperation("likingCommentIds", id, true);
    this.syncComments();
    try {
      await setCommentLiked(id, liked);
    } catch {
      rollback();
      this.syncComments();
    } finally {
      this.setCommentOperation("likingCommentIds", id, false);
    }
  },
  async deleteOwnComment(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    const commentId = event.detail.id;
    if (!requireLogin(postDetailUrl(this.postId))) return;
    if (this.data.deletingCommentIds[commentId]) return;
    const confirmed = await this.confirmDelete();
    if (!confirmed) return;
    this.setCommentOperation("deletingCommentIds", commentId, true);
    try {
      await removeComment(commentId);
      if (commentStore.applyDelete(this.postId, commentId)) {
        this.adjustCommentCount(-1);
        this.syncComments();
      }
    } catch (error) {
      wx.showToast({
        title: this.errorMessage(error, "删除失败，请稍后重试"),
        icon: "none",
      });
    } finally {
      this.setCommentOperation("deletingCommentIds", commentId, false);
    }
  },
  restoreComposerIntent() {
    const intent = commentStore.consumeComposerIntent(this.postId);
    if (!intent) return;
    this.setData({
      replyTarget: intent.target,
      composerDraft: intent.content,
      composerFocusToken: this.data.composerFocusToken + 1,
    });
  },
  adjustCommentCount(delta: number) {
    const post = this.data.post;
    if (post) {
      this.setData({
        post: {
          ...post,
          commentCount: Math.max(0, post.commentCount + delta),
        },
      });
    }
    feedStore.adjustPostCommentCount(this.postId, delta);
    sectionStore.adjustPostCommentCount(this.postId, delta);
  },
  syncComments() {
    if (!this.postId) return;
    const state = commentStore.getState(this.postId, this.data.commentSort);
    this.setData({
      commentThreads: state.items,
      commentsLoading: state.loading,
      commentsRefreshing: state.refreshing,
      commentsHasMore: state.hasMore,
    });
  },
  restoreCommentScroll() {
    const scrollTop = commentStore.getState(
      this.postId,
      this.data.commentSort,
    ).scrollTop;
    setTimeout(() => wx.pageScrollTo({ scrollTop, duration: 0 }), 0);
  },
  scrollToComment(commentId: string) {
    this.setData({ highlightedCommentId: commentId });
    wx.nextTick(() => {
      const query = wx.createSelectorQuery();
      query.select(`#comment-${commentId}`).boundingClientRect();
      query.selectViewport().scrollOffset();
      query.exec((result) => {
        const rect =
          result[0] as WechatMiniprogram.BoundingClientRectCallbackResult;
        const viewport =
          result[1] as WechatMiniprogram.ScrollOffsetCallbackResult;
        if (rect && viewport) {
          wx.pageScrollTo({
            scrollTop: Math.max(0, viewport.scrollTop + rect.top - 180),
            duration: 260,
          });
        }
      });
    });
    this.highlightTimer = setTimeout(
      () => this.setData({ highlightedCommentId: "" }),
      1800,
    );
  },
  scrollToComments() {
    wx.nextTick(() => {
      const query = wx.createSelectorQuery();
      query.select("#comments").boundingClientRect();
      query.selectViewport().scrollOffset();
      query.exec((result) => {
        const rect =
          result[0] as WechatMiniprogram.BoundingClientRectCallbackResult;
        const viewport =
          result[1] as WechatMiniprogram.ScrollOffsetCallbackResult;
        if (rect && viewport) {
          wx.pageScrollTo({
            scrollTop: Math.max(0, viewport.scrollTop + rect.top - 120),
            duration: 260,
          });
        }
      });
    });
  },
  confirmDelete(): Promise<boolean> {
    return new Promise((resolve) => {
      wx.showModal({
        title: "删除评论",
        content: "删除后无法恢复，确定继续吗？",
        confirmText: "删除",
        confirmColor: "#ff5f57",
        success: (result) => resolve(result.confirm),
        fail: () => resolve(false),
      });
    });
  },
  setCommentOperation(
    field: "likingCommentIds" | "deletingCommentIds",
    id: string,
    active: boolean,
  ) {
    this.setData({ [field]: { ...this.data[field], [id]: active } });
  },
  errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  },
  isUnauthorized(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === "object" &&
      "statusCode" in error &&
      (error as { statusCode?: number }).statusCode === 401
    );
  },
  postId: "",
  initialized: false,
  lastLoggedIn: authStore.isLoggedIn(),
  highlightTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
});
