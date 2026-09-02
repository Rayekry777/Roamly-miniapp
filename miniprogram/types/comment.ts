import type { UserSummary } from "./post";

export type CommentSort = "HOT" | "LATEST";
export type CommentStatus = "NORMAL" | "DELETED";

export interface CommentCreateRequest {
  content: string;
}

export interface PostComment {
  id: string;
  postId: string;
  author: UserSummary;
  rootId?: string;
  parentId?: string;
  replyToUser?: UserSummary;
  content: string;
  likedCount: number;
  replyCount: number;
  likedByMe: boolean;
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
