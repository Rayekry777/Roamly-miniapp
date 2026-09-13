import type { Shop } from "../../types";

Component({
  properties: {
    shop: { type: Object, value: {} },
    compact: { type: Boolean, value: false },
  },
  data: {
    scoreText: "0.0",
    scoreStars: "☆☆☆☆☆",
  },
  observers: {
    shop(value: Shop) {
      if (!value?.id) return;
      const score = Number(value.score) || 0;
      const filled = Math.max(0, Math.min(5, Math.round(score)));
      this.setData({
        scoreText: score.toFixed(1),
        scoreStars: `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`,
      });
    },
  },
  methods: {
    onVoucher(event: WechatMiniprogram.TouchEvent) {
      this.triggerEvent("voucher", {
        id: String(event.currentTarget.dataset.id),
      });
    },
    onSelect() {
      this.triggerEvent("select", { id: (this.data.shop as Shop).id });
    },
    onNavigate() {
      const shop = this.data.shop as Shop;
      if (shop.longitude == null || shop.latitude == null) return;
      this.triggerEvent("navigate", {
        latitude: shop.latitude,
        longitude: shop.longitude,
        name: shop.name,
        address: shop.address || "",
      });
    },
  },
});
