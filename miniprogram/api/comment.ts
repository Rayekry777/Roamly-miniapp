import type {
  CommentCreateRequest,
  CommentSort,
  CommentThread,
  CursorPageResult,
  PostComment,
  Result,
} from "../types";
import { request } from "../utils/request";

export interface CommentPageQuery {
  cursor?: number;
  offset?: number;
  size?: number;
}

export interface RootCommentQuery extends CommentPageQuery {
  sort: CommentSort;
}

export function listPostComments(
  postId: string,
  query: RootCommentQuery,
): Promise<Result<CursorPageResult<CommentThread>>> {
  return request(`/v1/posts/${postId}/comments`, {
    data: compactCommentQuery(query),
    auth: "optional",
    showError: false,
  });
}

export function createPostComment(
  postId: string,
  data: CommentCreateRequest,
): Promise<Result<PostComment>> {
  return request(`/v1/posts/${postId}/comments`, {
    method: "POST",
    data,
    dedupe: false,
    showError: false,
  });
}

export function listCommentReplies(
  commentId: string,
  query: CommentPageQuery = {},
): Promise<Result<CursorPageResult<PostComment>>> {
  return request(`/v1/comments/${commentId}/replies`, {
    data: compactCommentQuery(query),
    auth: "optional",
    showError: false,
  });
}

export function createCommentReply(
  commentId: string,
  data: CommentCreateRequest,
): Promise<Result<PostComment>> {
  return request(`/v1/comments/${commentId}/replies`, {
    method: "POST",
    data,
    dedupe: false,
    showError: false,
  });
}

export const deleteComment = (commentId: string): Promise<Result<null>> =>
  request(`/v1/comments/${commentId}`, {
    method: "DELETE",
    dedupe: false,
    showError: false,
  });

export const likeComment = (commentId: string): Promise<Result<null>> =>
  request(`/v1/comments/${commentId}/like`, {
    method: "PUT",
    dedupe: false,
    showError: false,
  });

export const unlikeComment = (commentId: string): Promise<Result<null>> =>
  request(`/v1/comments/${commentId}/like`, {
    method: "DELETE",
    dedupe: false,
    showError: false,
  });

function compactCommentQuery(
  query: CommentPageQuery & { sort?: CommentSort },
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (query.sort) result.sort = query.sort;
  if (query.cursor !== undefined) result.cursor = query.cursor;
  if (query.offset !== undefined) result.offset = query.offset;
  if (query.size !== undefined) result.size = query.size;
  return result;
}
