import type { SectionSummary } from "../../types";

Component({
  properties: {
    section: { type: Object, value: {} },
    showFollow: { type: Boolean, value: false },
  },
  methods: {
    onSelect() {
      const section = this.data.section as SectionSummary;
      this.triggerEvent("select", { id: section.id });
    },
    onFollow() {
      const section = this.data.section as SectionSummary;
      this.triggerEvent("follow", {
        id: section.id,
        followed: !section.followedByMe,
      });
    },
  },
});
