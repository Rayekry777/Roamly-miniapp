import type { HighlightComment } from "../../types";

Component({
  properties: {
    comment: { type: Object, value: {} },
  },
  methods: {
    onOpen() {
      const comment = this.data.comment as HighlightComment;
      this.triggerEvent("open", { id: comment.id });
    },
  },
});
