import type { PostCard } from "../../types";
import { formatRelativeTime } from "../../utils/time";

Component({
  properties: {
    post: { type: Object, value: {} },
    currentUserId: { type: String, value: "" },
    liking: { type: Boolean, value: false },
    following: { type: Boolean, value: false },
  },
  data: {
    displayTime: "",
  },
  observers: {
    post(post: PostCard) {
      this.setData({ displayTime: formatRelativeTime(post?.createdTime || "") });
    },
  },
  methods: {
    onOpenPost() {
      this.triggerEvent("openpost", { id: this.post().id });
    },
    onOpenAuthor() {
      this.triggerEvent("openauthor", { id: this.post().author.id });
    },
    onOpenSection() {
      this.triggerEvent("opensection", { id: this.post().section.id });
    },
    onLike() {
      const post = this.post();
      this.triggerEvent("like", { id: post.id, liked: !post.likedByMe });
    },
    onComment() {
      this.triggerEvent("comment", { id: this.post().id });
    },
    onFollow() {
      const post = this.post();
      this.triggerEvent("follow", {
        authorId: post.author.id,
        followed: !post.followingAuthor,
      });
    },
    onOpenHighlight(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
      this.triggerEvent("openhighlight", {
        postId: this.post().id,
        commentId: event.detail.id,
      });
    },
    post(): PostCard {
      return this.data.post as PostCard;
    },
  },
});
