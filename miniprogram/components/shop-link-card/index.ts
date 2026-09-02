import type { ShopSummary } from "../../types";

Component({
  properties: {
    shop: { type: Object, value: {} },
  },
  methods: {
    onOpen() {
      const shop = this.data.shop as ShopSummary;
      this.triggerEvent("open", { id: shop.id });
    },
  },
});
