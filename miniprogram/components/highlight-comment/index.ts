import type { HighlightComment } from "../../types";

Component({
  properties: {
    comment: { type: Object, value: {} },
  },
  methods: {
    onOpenAuthor() {
      const comment = this.data.comment as HighlightComment;
      this.triggerEvent("openauthor", { id: comment.author.id });
    },
    onOpen() {
      const comment = this.data.comment as HighlightComment;
      this.triggerEvent("open", { id: comment.id });
    },
  },
});
