import type { Shop } from "../../types";

Component({
  properties: {
    shop: { type: Object, value: {} },
  },
  data: {
    scoreText: "0.0",
  },
  observers: {
    shop(value: Shop) {
      if (!value?.id) return;
      this.setData({ scoreText: value.score.toFixed(1) });
    },
  },
  methods: {
    onSelect() {
      this.triggerEvent("select", { id: (this.data.shop as Shop).id });
    },
  },
});
