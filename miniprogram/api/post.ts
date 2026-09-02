import type {
  IdResponse,
  PageResult,
  PostCard,
  PostCreateRequest,
  PostDetail,
  PostUpdateRequest,
  Result,
  UserSummary,
} from "../types";
import { request } from "../utils/request";

export const createPost = (
  data: PostCreateRequest,
): Promise<Result<IdResponse>> =>
  request("/v1/posts", { method: "POST", data, dedupe: false });

export const getPost = (postId: string): Promise<Result<PostDetail>> =>
  request(`/v1/posts/${postId}`, { auth: "optional" });

export const updatePost = (
  postId: string,
  data: PostUpdateRequest,
): Promise<Result<PostDetail>> =>
  request(`/v1/posts/${postId}`, {
    method: "PUT",
    data,
    dedupe: false,
  });

export const deletePost = (postId: string): Promise<Result<null>> =>
  request(`/v1/posts/${postId}`, { method: "DELETE", dedupe: false });

export const listMyPosts = (
  page = 1,
  size = 10,
): Promise<Result<PageResult<PostCard>>> =>
  request("/v1/users/me/posts", { data: { page, size } });

export const listUserPosts = (
  userId: string,
  page = 1,
  size = 10,
): Promise<Result<PageResult<PostCard>>> =>
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

export const listPostLikes = (
  postId: string,
  page = 1,
  size = 10,
): Promise<Result<PageResult<UserSummary>>> =>
  request(`/v1/posts/${postId}/likes`, {
    data: { page, size },
    auth: "public",
  });
