import type { CommentThread } from "../../types";

Component({
  properties: {
    thread: { type: Object, value: {} },
    likingIds: { type: Object, value: {} },
    deletingIds: { type: Object, value: {} },
    highlightedId: { type: String, value: "" },
  },
  methods: {
    onReply(event: WechatMiniprogram.CustomEvent) {
      this.triggerEvent("reply", event.detail);
    },
    onLike(event: WechatMiniprogram.CustomEvent) {
      this.triggerEvent("like", event.detail);
    },
    onDelete(event: WechatMiniprogram.CustomEvent) {
      this.triggerEvent("delete", event.detail);
    },
    onLoadReplies() {
      const thread = this.data.thread as CommentThread;
      this.triggerEvent("loadreplies", { rootId: thread.root.id });
    },
  },
});
