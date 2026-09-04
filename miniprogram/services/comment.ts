import {
  createCommentReply,
  createPostComment,
  deleteComment,
  likeComment,
  listCommentReplies,
  listPostComments,
  unlikeComment,
  type CommentPageQuery,
  type RootCommentQuery,
} from "../api/comment";
import type {
  CommentResponse,
  CommentThread,
  CommentThreadResponse,
  CursorPageResult,
  PostComment,
} from "../types";

export async function loadRootComments(
  postId: string,
  query: RootCommentQuery,
): Promise<CursorPageResult<CommentThread>> {
  const result = await listPostComments(postId, query);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("评论列表响应格式异常，请稍后重试");
  }
  return {
    ...result.data,
    nextCursor: normalizeCursor(result.data.nextCursor, result.data.hasMore),
    items: result.data.items.map((thread) => adaptThread(postId, thread)),
  };
}

export async function loadReplies(
  postId: string,
  rootCommentId: string,
  query: CommentPageQuery,
): Promise<CursorPageResult<PostComment>> {
  const result = await listCommentReplies(rootCommentId, query);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("回复列表响应格式异常，请稍后重试");
  }
  return {
    ...result.data,
    nextCursor: normalizeCursor(result.data.nextCursor, result.data.hasMore),
    items: result.data.items.map((comment) => adaptComment(comment, postId)),
  };
}

export async function submitRootComment(
  postId: string,
  content: string,
): Promise<PostComment> {
  const normalized = validateCommentContent(content);
  const result = await createPostComment(postId, { content: normalized });
  if (!result.data) throw new Error("评论结果缺少内容");
  return adaptComment(result.data, postId);
}

export async function submitReply(
  postId: string,
  targetCommentId: string,
  content: string,
): Promise<PostComment> {
  const normalized = validateCommentContent(content);
  const result = await createCommentReply(targetCommentId, {
    content: normalized,
  });
  if (!result.data) throw new Error("回复结果缺少内容");
  return adaptComment(result.data, postId);
}

export async function removeComment(commentId: string): Promise<void> {
  await deleteComment(commentId);
}

export async function setCommentLiked(
  commentId: string,
  liked: boolean,
): Promise<void> {
  if (liked) await likeComment(commentId);
  else await unlikeComment(commentId);
}

export function validateCommentContent(content: string): string {
  const normalized = content.trim();
  if (!normalized) throw new Error("请输入评论内容");
  if (normalized.length > 1000) throw new Error("评论最多 1000 个字");
  return normalized;
}

function adaptThread(
  postId: string,
  thread: CommentThreadResponse,
): CommentThread {
  const root = adaptComment(thread.root, postId);
  const replyCount = Number(thread.replyCount || 0);
  return {
    root: { ...root, replyCount },
    replies: (thread.previewReplies || []).map((comment) =>
      adaptComment(comment, postId),
    ),
    replyCount,
    hasMoreReplies: Boolean(thread.hasMoreReplies),
    nextReplyCursor: normalizeCursor(
      thread.nextReplyCursor,
      thread.hasMoreReplies,
    ),
    nextReplyOffset: Number(thread.nextReplyOffset || 0),
  };
}

function adaptComment(comment: CommentResponse, postId: string): PostComment {
  return {
    id: String(comment.id),
    postId,
    rootId: String(comment.rootId || comment.id),
    author: { ...comment.author, id: String(comment.author.id) },
    replyToUser: comment.replyToUser
      ? { ...comment.replyToUser, id: String(comment.replyToUser.id) }
      : undefined,
    content: comment.content ?? "",
    postAuthor: Boolean(comment.postAuthor),
    likedCount: Number(comment.likedCount || 0),
    replyCount: 0,
    likedByMe: Boolean(comment.likedByMe),
    deletable: Boolean(comment.deletable),
    status: comment.deleted ? "DELETED" : "NORMAL",
    createdTime: comment.createdTime,
  };
}

function normalizeCursor(
  cursor: number | null,
  hasMore: boolean,
): number | null {
  return hasMore ? Number(cursor || 0) : null;
}
