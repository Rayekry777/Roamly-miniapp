import type { SectionSummary } from "./section";

export type PostCommentSort = "HOT" | "LATEST";

export interface UserSummary {
  id: string;
  nickName: string;
  icon?: string;
}

export interface ShopSummary {
  id: string;
  name: string;
  cover?: string;
  typeId?: string;
  typeName?: string;
  address?: string;
  distance?: number;
  score?: number;
}

export interface HighlightComment {
  id: string;
  author: UserSummary;
  content: string;
  likedCount: number;
  replyCount: number;
}

export interface PostMedia {
  id: string;
  url: string;
  width?: number;
  height?: number;
  mimeType: string;
}

export interface PostMediaResponse {
  id: string;
  path: string;
  width?: number;
  height?: number;
  mimeType: string;
}

export interface HighlightCommentResponse {
  id: string;
  author: UserSummary;
  contentPreview: string;
  likedCount: number;
  replyCount: number;
}

export interface PostCard {
  id: string;
  author: UserSummary;
  section: SectionSummary;
  title?: string;
  contentPreview: string;
  media: PostMedia[];
  shopVisit: boolean;
  likedCount: number;
  commentCount: number;
  likedByMe: boolean;
  followingAuthor: boolean;
  highlightComment?: HighlightComment;
  createdTime: string;
}

export interface PostCardResponse
  extends Omit<PostCard, "media" | "highlightComment"> {
  media: PostMediaResponse[];
  highlightComment?: HighlightCommentResponse;
}

export interface ShopSummaryResponse {
  id: string;
  name: string;
  typeId?: string;
  typeName?: string;
  cover?: string;
  address?: string;
  distance?: number;
  score?: number;
}

export interface PostDetailResponse
  extends Omit<PostCardResponse, "contentPreview" | "highlightComment"> {
  content: string;
  shop?: ShopSummaryResponse;
  editable: boolean;
  deletable: boolean;
  defaultCommentSort: PostCommentSort;
}

export interface PostDetail extends PostCard {
  content: string;
  shop?: ShopSummary;
  editable: boolean;
  deletable: boolean;
  defaultCommentSort: PostCommentSort;
}

export interface PostCreateRequest {
  title?: string;
  content: string;
  mediaIds?: string[];
  shopVisit: boolean;
  sectionId?: string;
  shopId?: string;
}

export type PostUpdateRequest = PostCreateRequest;
