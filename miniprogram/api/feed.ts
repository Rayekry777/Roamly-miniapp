import type { CursorPageResult, PostCard, Result } from "../types";
import { request } from "../utils/request";

export interface FeedQuery {
  cursor?: number;
  offset?: number;
  size?: number;
}

export interface RecommendedFeedQuery extends FeedQuery {
  cityCode: string;
}

export const listRecommendedPosts = (
  query: RecommendedFeedQuery,
): Promise<Result<CursorPageResult<PostCard>>> =>
  request("/v1/feeds/recommended", {
    data: compactFeedQuery(query),
    auth: "optional",
  });

export const listFollowingPosts = (
  query: FeedQuery = {},
): Promise<Result<CursorPageResult<PostCard>>> =>
  request("/v1/feeds/following", {
    data: compactFeedQuery(query),
  });

function compactFeedQuery(query: FeedQuery): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if ("cityCode" in query && query.cityCode) result.cityCode = query.cityCode;
  if (query.cursor !== undefined) result.cursor = query.cursor;
  if (query.offset !== undefined) result.offset = query.offset;
  if (query.size !== undefined) result.size = query.size;
  return result;
}
