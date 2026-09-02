import {
  listFollowingPosts,
  listRecommendedPosts,
  type FeedQuery,
} from "../api/feed";
import { likePost, unlikePost } from "../api/post";
import { listSections } from "../api/section";
import { followUser } from "../api/follow";
import type { HomeFeedMode } from "../store/feed";
import type {
  CursorPageResult,
  PostCard,
  SectionSummary,
} from "../types";

export interface LoadFeedOptions extends FeedQuery {
  cityCode?: string;
}

export async function loadFeedPage(
  mode: HomeFeedMode,
  options: LoadFeedOptions,
): Promise<CursorPageResult<PostCard>> {
  const result =
    mode === "RECOMMENDED"
      ? await listRecommendedPosts({
          cityCode: requireCityCode(options.cityCode),
          cursor: options.cursor,
          offset: options.offset,
          size: options.size,
        })
      : await listFollowingPosts(options);

  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("信息流接口尚未完成升级，请稍后重试");
  }
  return result.data;
}

export async function loadHomeSections(): Promise<SectionSummary[]> {
  const result = await listSections();
  return result.data || [];
}

export async function setPostLiked(postId: string, liked: boolean): Promise<void> {
  if (liked) await likePost(postId);
  else await unlikePost(postId);
}

export async function setAuthorFollowing(
  authorId: string,
  following: boolean,
): Promise<void> {
  await followUser(authorId, following);
}

function requireCityCode(cityCode?: string): string {
  if (!cityCode) throw new Error("当前暂无可用城市");
  return cityCode;
}
