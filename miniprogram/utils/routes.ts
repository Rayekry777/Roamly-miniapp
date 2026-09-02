export function postDetailUrl(
  postId: string,
  options: { focusCommentId?: string; focusComposer?: boolean } = {},
): string {
  const query = [`id=${encodeURIComponent(postId)}`];
  if (options.focusCommentId) {
    query.push(`focusCommentId=${encodeURIComponent(options.focusCommentId)}`);
  }
  if (options.focusComposer) query.push("focusComposer=1");
  return `/package-post/pages/detail/index?${query.join("&")}`;
}

export function sectionDetailUrl(sectionId: string): string {
  return `/package-section/pages/detail/index?id=${encodeURIComponent(sectionId)}`;
}

export function userProfileUrl(userId: string): string {
  return `/package-user/pages/profile/index?id=${encodeURIComponent(userId)}`;
}
