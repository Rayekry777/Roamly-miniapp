import type {
  IdResponse,
  PageResult,
  PostCardResponse,
  PostCreateRequest,
  PostDetailResponse,
  Result,
} from "../types";
import { request } from "../utils/request";

export const createPost = (
  data: PostCreateRequest,
): Promise<Result<IdResponse>> =>
  request("/v1/posts", {
    method: "POST",
    data,
    dedupe: false,
    showError: false,
  });

export const getPost = (postId: string): Promise<Result<PostDetailResponse>> =>
  request(`/v1/posts/${postId}`, {
    auth: "optional",
    showError: false,
  });

export const listMyPosts = (
  page = 1,
  size = 10,
): Promise<Result<PageResult<PostCardResponse>>> =>
  request("/v1/users/me/posts", { data: { page, size } });

export const listUserPosts = (
  userId: string,
  page = 1,
  size = 10,
): Promise<Result<PageResult<PostCardResponse>>> =>
  request(`/v1/users/${userId}/posts`, {
    data: { page, size },
    auth: "public",
  });

export const likePost = (postId: string): Promise<Result<null>> =>
  request(`/v1/posts/${postId}/like`, { method: "PUT", dedupe: false });

export const unlikePost = (postId: string): Promise<Result<null>> =>
  request(`/v1/posts/${postId}/like`, {
    method: "DELETE",
    dedupe: false,
  });
