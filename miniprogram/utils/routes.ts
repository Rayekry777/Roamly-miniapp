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

export function shopDetailUrl(shopId: string): string {
  return `/package-shop/pages/detail/index?id=${encodeURIComponent(shopId)}`;
}

export function shopReviewsUrl(shopId: string): string {
  return `/package-shop/pages/reviews/index?id=${encodeURIComponent(shopId)}`;
}

export function voucherProductUrl(productId: string): string {
  return `/package-voucher/pages/product/index?id=${encodeURIComponent(productId)}`;
}

export function orderConfirmUrl(productId: string): string {
  return `/package-order/pages/confirm/index?id=${encodeURIComponent(productId)}`;
}

export function orderDetailUrl(orderId: string): string {
  return `/package-order/pages/detail/index?id=${encodeURIComponent(orderId)}`;
}

export function voucherDetailUrl(voucherId: string): string {
  return `/package-voucher/pages/wallet/index?id=${encodeURIComponent(voucherId)}`;
}
