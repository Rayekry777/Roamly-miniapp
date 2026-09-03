import * as reviewApi from "../api/review";
import type {
  PageResult,
  ReviewCreateRequest,
  ReviewSort,
  ShopReview,
  ShopReviewResponse,
} from "../types";
import { imageUrl } from "../utils/media";

export async function loadReviewPage(
  shopId: string,
  query: { page?: number; size?: number; sort?: ReviewSort } = {},
): Promise<PageResult<ShopReview>> {
  const result = await reviewApi.listShopReviews(shopId, query);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("点评接口尚未完成升级，请稍后重试");
  }
  return {
    ...result.data,
    items: result.data.items
      .filter((item) => item.status !== "HIDDEN" && item.status !== "DELETED")
      .map(normalizeReview),
  };
}

export async function createReview(
  shopId: string,
  request: ReviewCreateRequest,
): Promise<ShopReview> {
  const result = await reviewApi.createShopReview(
    shopId,
    normalizeRequest(request),
  );
  if (!result.data) throw new Error("点评结果缺少内容");
  return normalizeReview(result.data);
}

export async function updateReview(
  shopId: string,
  request: ReviewCreateRequest,
): Promise<ShopReview> {
  const result = await reviewApi.updateMyShopReview(
    shopId,
    normalizeRequest(request),
  );
  if (!result.data) throw new Error("点评结果缺少内容");
  return normalizeReview(result.data);
}

export function removeReview(shopId: string): Promise<void> {
  return reviewApi.deleteMyShopReview(shopId).then(() => undefined);
}

export function normalizeRequest(
  request: ReviewCreateRequest,
): ReviewCreateRequest {
  const content = request.content.trim();
  if (
    !Number.isInteger(request.score) ||
    request.score < 1 ||
    request.score > 5
  ) {
    throw new Error("请选择 1 到 5 分");
  }
  if (!content) throw new Error("请输入点评内容");
  if (content.length > 2000) throw new Error("点评最多 2000 个字");
  const mediaIds = [...new Set((request.mediaIds || []).map(String))].slice(
    0,
    9,
  );
  return mediaIds.length
    ? { score: request.score, content, mediaIds }
    : { score: request.score, content };
}

function normalizeReview(review: ShopReviewResponse): ShopReview {
  return {
    ...review,
    id: String(review.id),
    shopId: String(review.shopId),
    author: { ...review.author, id: String(review.author.id) },
    media: (review.media || []).map((item) => ({
      ...item,
      id: String(item.id),
      url: imageUrl(item.url),
    })),
    editable: review.editable === true,
  };
}
