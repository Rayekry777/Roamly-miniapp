import type { PostComment } from "../../types";
import { formatRelativeTime } from "../../utils/time";

Component({
  properties: {
    comment: { type: Object, value: {} },
    root: { type: Boolean, value: false },
    postAuthorId: { type: String, value: "" },
    currentUserId: { type: String, value: "" },
    liking: { type: Boolean, value: false },
    deleting: { type: Boolean, value: false },
  },
  data: {
    displayTime: "",
  },
  observers: {
    comment(comment: PostComment) {
      this.setData({
        displayTime: formatRelativeTime(comment?.createdTime || ""),
      });
    },
  },
  methods: {
    onReply() {
      const comment = this.comment();
      if (comment.status === "DELETED") return;
      this.triggerEvent("reply", {
        commentId: comment.id,
        rootId: comment.rootId || comment.id,
        user: comment.author,
      });
    },
    onLike() {
      const comment = this.comment();
      if (comment.status === "DELETED") return;
      this.triggerEvent("like", {
        id: comment.id,
        liked: !comment.likedByMe,
      });
    },
    onDelete() {
      const comment = this.comment();
      if (comment.status === "DELETED") return;
      this.triggerEvent("delete", { id: comment.id });
    },
    comment(): PostComment {
      return this.data.comment as PostComment;
    },
  },
});
