import type {
  PageResult,
  Result,
  ReviewCreateRequest,
  ReviewSort,
  ReviewUpdateRequest,
  ShopReviewResponse,
} from "../types";
import { request } from "../utils/request";

export function listShopReviews(
  shopId: string,
  query: { page?: number; size?: number; sort?: ReviewSort } = {},
): Promise<Result<PageResult<ShopReviewResponse>>> {
  return request(`/v1/shops/${shopId}/reviews`, {
    data: {
      page: query.page || 1,
      size: query.size || 10,
      sort: query.sort || "LATEST",
    },
    auth: "optional",
    showError: false,
  });
}

export const createShopReview = (
  shopId: string,
  data: ReviewCreateRequest,
): Promise<Result<ShopReviewResponse>> =>
  request(`/v1/shops/${shopId}/reviews`, {
    method: "POST",
    data,
    dedupe: false,
    showError: false,
  });

export const updateMyShopReview = (
  shopId: string,
  data: ReviewUpdateRequest,
): Promise<Result<ShopReviewResponse>> =>
  request(`/v1/shops/${shopId}/reviews/me`, {
    method: "PUT",
    data,
    dedupe: false,
    showError: false,
  });

export const deleteMyShopReview = (shopId: string): Promise<Result<null>> =>
  request(`/v1/shops/${shopId}/reviews/me`, {
    method: "DELETE",
    dedupe: false,
    showError: false,
  });
