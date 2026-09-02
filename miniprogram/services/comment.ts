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
import type { CommentThread, CursorPageResult, PostComment } from "../types";

export async function loadRootComments(
  postId: string,
  query: RootCommentQuery,
): Promise<CursorPageResult<CommentThread>> {
  const result = await listPostComments(postId, query);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("评论接口尚未完成升级，请稍后重试");
  }
  return {
    ...result.data,
    items: result.data.items.map(normalizeThread),
  };
}

export async function loadReplies(
  rootCommentId: string,
  query: CommentPageQuery,
): Promise<CursorPageResult<PostComment>> {
  const result = await listCommentReplies(rootCommentId, query);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("回复接口尚未完成升级，请稍后重试");
  }
  return {
    ...result.data,
    items: result.data.items.map(normalizeComment),
  };
}

export async function submitRootComment(
  postId: string,
  content: string,
): Promise<PostComment> {
  const normalized = validateCommentContent(content);
  const result = await createPostComment(postId, { content: normalized });
  if (!result.data) throw new Error("评论结果缺少内容");
  return normalizeComment(result.data);
}

export async function submitReply(
  targetCommentId: string,
  content: string,
): Promise<PostComment> {
  const normalized = validateCommentContent(content);
  const result = await createCommentReply(targetCommentId, {
    content: normalized,
  });
  if (!result.data) throw new Error("回复结果缺少内容");
  return normalizeComment(result.data);
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

function normalizeThread(thread: CommentThread): CommentThread {
  return {
    ...thread,
    root: normalizeComment(thread.root),
    replies: (thread.replies || []).map(normalizeComment),
  };
}

function normalizeComment(comment: PostComment): PostComment {
  return {
    ...comment,
    id: String(comment.id),
    postId: String(comment.postId),
    rootId: comment.rootId ? String(comment.rootId) : undefined,
    parentId: comment.parentId ? String(comment.parentId) : undefined,
    author: { ...comment.author, id: String(comment.author.id) },
    replyToUser: comment.replyToUser
      ? { ...comment.replyToUser, id: String(comment.replyToUser.id) }
      : undefined,
  };
}
