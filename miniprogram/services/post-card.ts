import type { PostCard, PostCardResponse } from "../types";

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
