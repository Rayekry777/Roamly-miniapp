import {
  followSection,
  getSection,
  listSectionPosts,
  listSections,
  unfollowSection,
} from "../api/section";
import type {
  CursorPageResult,
  PostCard,
  SectionDetail,
  SectionPostSort,
  SectionSummary,
} from "../types";
import { adaptPostCard } from "./post-card";

export interface LoadSectionPostsOptions {
  cityCode?: string;
  sort: SectionPostSort;
  cursor?: number;
  offset?: number;
  size?: number;
}

export async function loadSections(): Promise<SectionSummary[]> {
  const result = await listSections();
  if (!Array.isArray(result.data)) {
    throw new Error("分区接口返回格式异常，请稍后重试");
  }
  return result.data.map(normalizeSection);
}

export async function loadSectionDetail(
  sectionId: string,
): Promise<SectionDetail> {
  const result = await getSection(sectionId);
  if (!result.data) throw new Error("分区不存在或暂不可用");
  return normalizeSection(result.data);
}

export async function loadSectionPostPage(
  sectionId: string,
  options: LoadSectionPostsOptions,
): Promise<CursorPageResult<PostCard>> {
  const result = await listSectionPosts(sectionId, options);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("分区动态接口尚未完成升级，请稍后重试");
  }
  return {
    ...result.data,
    items: result.data.items.map(adaptPostCard),
  };
}

export async function setSectionFollowing(
  sectionId: string,
  followed: boolean,
): Promise<void> {
  if (followed) await followSection(sectionId);
  else await unfollowSection(sectionId);
}

function normalizeSection<T extends SectionSummary>(section: T): T {
  return {
    ...section,
    id: String(section.id),
  };
}
