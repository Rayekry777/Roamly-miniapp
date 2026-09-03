import { createPost, getPost, listMyPosts, listUserPosts } from "../api/post";
import type {
  IdResponse,
  PageResult,
  PostCard,
  PostCreateRequest,
  PostDetail,
  PostDraft,
} from "../types";
import type { ApiError } from "../utils/request";
import { adaptPostCard, adaptPostDetail } from "./post-card";

export async function loadMyPostPage(
  page = 1,
  size = 10,
): Promise<PageResult<PostCard>> {
  const result = await listMyPosts(page, size);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("我的动态暂时加载失败");
  }
  return {
    ...result.data,
    items: result.data.items.map(adaptPostCard),
  };
}

export async function loadUserPostPage(
  userId: string,
  page = 1,
  size = 10,
): Promise<PageResult<PostCard>> {
  const result = await listUserPosts(String(userId), page, size);
  if (!result.data || !Array.isArray(result.data.items)) {
    throw new Error("用户动态暂时加载失败");
  }
  return {
    ...result.data,
    items: result.data.items.map(adaptPostCard),
  };
}

export interface DraftValidationError {
  field: "title" | "content" | "media" | "section" | "shop";
  message: string;
}

export class DraftSubmissionError extends Error {
  constructor(
    message: string,
    public readonly field?: DraftValidationError["field"],
  ) {
    super(message);
    this.name = "DraftSubmissionError";
  }
}

export function validatePostDraft(
  draft: PostDraft,
): DraftValidationError | null {
  if (draft.title.trim().length > 120) {
    return { field: "title", message: "标题最多 120 个字" };
  }
  const content = draft.content.trim();
  if (!content) return { field: "content", message: "请填写动态正文" };
  if (content.length > 5000) {
    return { field: "content", message: "正文最多 5000 个字" };
  }
  if (draft.media.length > 9) {
    return { field: "media", message: "最多上传 9 张图片" };
  }
  if (draft.media.some((item) => item.status !== "DONE" || !item.asset)) {
    return { field: "media", message: "请先完成或移除上传失败的图片" };
  }
  const mediaIds = draft.media.map((item) => item.asset!.id);
  if (mediaIds.some((id) => !id)) {
    return { field: "media", message: "图片资产信息无效，请重新上传" };
  }
  if (new Set(mediaIds).size !== mediaIds.length) {
    return { field: "media", message: "不能重复提交同一张图片" };
  }
  if (draft.shopVisit && !draft.section?.id) {
    return { field: "section", message: "请选择探店分区" };
  }
  if (draft.shopVisit && !draft.section?.allowShopVisit) {
    return { field: "section", message: "当前分区不允许发布探店动态" };
  }
  if (draft.shopVisit && !draft.shop?.id) {
    return { field: "shop", message: "请选择关联商户" };
  }
  return null;
}

export function buildPostCreateRequest(draft: PostDraft): PostCreateRequest {
  const error = validatePostDraft(draft);
  if (error) throw new DraftSubmissionError(error.message, error.field);

  const title = draft.title.trim();
  const request: PostCreateRequest = {
    content: draft.content.trim(),
    shopVisit: draft.shopVisit,
  };
  const mediaIds = draft.media.map((item) => item.asset!.id);
  if (mediaIds.length) request.mediaIds = mediaIds;
  if (title) request.title = title;
  if (draft.shopVisit) {
    request.sectionId = draft.section!.id;
    request.shopId = draft.shop!.id;
  }
  return request;
}

export async function publishPost(draft: PostDraft): Promise<IdResponse> {
  const request = buildPostCreateRequest(draft);
  return createPost(request).then(
    (result) => {
      if (!result.data) throw new DraftSubmissionError("发布结果缺少动态 ID");
      return result.data;
    },
    (error: unknown) => {
      throw toDraftSubmissionError(error);
    },
  );
}

export async function loadPostDetail(postId: string): Promise<PostDetail> {
  const result = await getPost(postId);
  if (!result.data) throw new Error("动态不存在或已删除");
  return adaptPostDetail(result.data);
}

export function toDraftSubmissionError(error: unknown): DraftSubmissionError {
  if (error instanceof DraftSubmissionError) return error;
  if (isApiError(error)) {
    const fieldError = error.fieldErrors?.[0];
    return new DraftSubmissionError(
      fieldError?.message || error.message,
      mapServerField(fieldError?.field),
    );
  }
  return new DraftSubmissionError(
    error instanceof Error ? error.message : "发布失败，请稍后重试",
  );
}

function isApiError(error: unknown): error is ApiError {
  if (!error || typeof error !== "object") return false;
  const candidate = error as Partial<ApiError>;
  return (
    typeof candidate.message === "string" &&
    typeof candidate.statusCode === "number" &&
    typeof candidate.code === "string"
  );
}

function mapServerField(
  field?: string,
): DraftValidationError["field"] | undefined {
  if (field === "title" || field === "content") return field;
  if (field === "mediaIds") return "media";
  if (field === "sectionId") return "section";
  if (field === "shopId") return "shop";
  return undefined;
}
