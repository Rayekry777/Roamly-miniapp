import type {
  PostCard,
  PostCardResponse,
  PostDetail,
  PostDetailResponse,
} from "../types";

export function adaptPostCard(response: PostCardResponse): PostCard {
  return {
    ...response,
    id: String(response.id),
    author: {
      ...response.author,
      id: String(response.author.id),
    },
    section: {
      ...response.section,
      id: String(response.section.id),
    },
    media: (response.media || []).map((item) => ({
      id: String(item.id),
      url: item.path,
      width: item.width,
      height: item.height,
      mimeType: item.mimeType,
    })),
    highlightComment: response.highlightComment
      ? {
          ...response.highlightComment,
          id: String(response.highlightComment.id),
          author: {
            ...response.highlightComment.author,
            id: String(response.highlightComment.author.id),
          },
          content: response.highlightComment.contentPreview,
        }
      : undefined,
  };
}

export function adaptPostDetail(response: PostDetailResponse): PostDetail {
  const card = adaptPostCard({
    ...response,
    contentPreview: response.content,
    highlightComment: undefined,
  });
  return {
    ...card,
    content: response.content,
    shop: response.shop
      ? {
          ...response.shop,
          id: String(response.shop.id),
          typeId: response.shop.typeId
            ? String(response.shop.typeId)
            : undefined,
          score:
            response.shop.score === undefined
              ? undefined
              : response.shop.score / 10,
        }
      : undefined,
    editable: response.editable,
    deletable: response.deletable,
    defaultCommentSort:
      response.defaultCommentSort === "LATEST" ? "LATEST" : "HOT",
  };
}
