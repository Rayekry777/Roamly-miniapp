import type { MediaAsset } from "./media";
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

export interface PostCard {
  id: string;
  author: UserSummary;
  section: SectionSummary;
  title?: string;
  contentPreview: string;
  media: MediaAsset[];
  shopVisit: boolean;
  likedCount: number;
  commentCount: number;
  likedByMe: boolean;
  followingAuthor: boolean;
  highlightComment?: HighlightComment;
  createdTime: string;
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
