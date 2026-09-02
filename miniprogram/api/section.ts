import type {
  CursorPageResult,
  PostCardResponse,
  Result,
  SectionDetail,
  SectionPostSort,
  SectionSummary,
} from "../types";
import { request } from "../utils/request";

export interface SectionListQuery {
  followedOnly?: boolean;
}

export interface SectionPostQuery {
  cityCode?: string;
  sort: SectionPostSort;
  cursor?: number;
  offset?: number;
  size?: number;
}

export function listSections(
  query: SectionListQuery = {},
): Promise<Result<SectionSummary[]>> {
  const options = query.followedOnly ? { followedOnly: true } : undefined;
  return request("/v1/sections", {
    ...(options ? { data: options } : {}),
    auth: query.followedOnly ? "required" : "optional",
    showError: false,
  });
}

export const getSection = (sectionId: string): Promise<Result<SectionDetail>> =>
  request(`/v1/sections/${sectionId}`, {
    auth: "optional",
    showError: false,
  });

export function listSectionPosts(
  sectionId: string,
  query: SectionPostQuery,
): Promise<Result<CursorPageResult<PostCardResponse>>> {
  return request(`/v1/sections/${sectionId}/posts`, {
    data: compactCursorQuery(query),
    auth: "optional",
    showError: false,
  });
}

export const followSection = (sectionId: string): Promise<Result<null>> =>
  request(`/v1/users/me/section-follows/${sectionId}`, {
    method: "PUT",
    dedupe: false,
  });

export const unfollowSection = (sectionId: string): Promise<Result<null>> =>
  request(`/v1/users/me/section-follows/${sectionId}`, {
    method: "DELETE",
    dedupe: false,
  });

function compactCursorQuery(query: SectionPostQuery): Record<string, unknown> {
  const result: Record<string, unknown> = { sort: query.sort };
  if (query.cityCode) result.cityCode = query.cityCode;
  if (query.cursor !== undefined) result.cursor = query.cursor;
  if (query.offset !== undefined) result.offset = query.offset;
  if (query.size !== undefined) result.size = query.size;
  return result;
}
