import type { UserSummary } from "./post";

export type CommentSort = "HOT" | "LATEST";
export type CommentStatus = "NORMAL" | "DELETED";

/** 与后端 CommentCreateDTO 对齐的评论创建请求。 */
export interface CommentCreateDTO {
  content: string;
}

/** 后端 CommentVO 的原始 HTTP 响应。 */
export interface CommentResponse {
  id: string;
  rootId: string;
  author: UserSummary;
  replyToUser: UserSummary | null;
  content: string | null;
  deleted: boolean;
  postAuthor: boolean;
  likedCount: number;
  likedByMe: boolean;
  deletable: boolean;
  createdTime: string;
}

/** 后端 CommentThreadVO 的原始 HTTP 响应。 */
export interface CommentThreadResponse {
  root: CommentResponse;
  previewReplies: CommentResponse[];
  replyCount: number;
  hasMoreReplies: boolean;
  nextReplyCursor: number;
  nextReplyOffset: number;
}

/** 供页面与 Store 使用的评论模型，由 Service 从 CommentResponse 适配。 */
export interface PostComment {
  id: string;
  postId: string;
  author: UserSummary;
  rootId: string;
  replyToUser?: UserSummary;
  content: string;
  postAuthor: boolean;
  likedCount: number;
  replyCount: number;
  likedByMe: boolean;
  deletable: boolean;
  status: CommentStatus;
  createdTime: string;
}

export interface CommentThread {
  root: PostComment;
  replies: PostComment[];
  replyCount: number;
  hasMoreReplies: boolean;
  nextReplyCursor: number | null;
  nextReplyOffset: number;
}

export interface CommentReplyTarget {
  commentId: string;
  rootId: string;
  user: UserSummary;
}
