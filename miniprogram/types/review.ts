import type { MediaAsset } from "./media";
import type { UserSummary } from "./post";

export type ReviewSort = "LATEST" | "HIGHEST_SCORE";
export type ReviewStatus = "NORMAL" | "HIDDEN" | "DELETED";

export interface ShopReviewResponse {
  id: string;
  shopId: string;
  author: UserSummary;
  score: number;
  content: string;
  media?: MediaAsset[];
  verifiedConsumption: boolean;
  editable?: boolean;
  status?: ReviewStatus;
  createdTime: string;
  updatedTime?: string;
}

export interface ShopReview {
  id: string;
  shopId: string;
  author: UserSummary;
  score: number;
  content: string;
  media: MediaAsset[];
  verifiedConsumption: boolean;
  editable: boolean;
  createdTime: string;
  updatedTime?: string;
}

export interface ReviewCreateRequest {
  score: number;
  content: string;
  mediaIds?: string[];
}

export type ReviewUpdateRequest = ReviewCreateRequest;
