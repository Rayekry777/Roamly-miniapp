import type { VoucherProductListItem } from "../../types";

Component({
  properties: {
    item: {
      type: Object,
      value: null,
    },
    compactShop: {
      type: Boolean,
      value: false,
    },
  },
  methods: {
    select() {
      const item = this.data.item as VoucherProductListItem | null;
      if (item?.product.id)
        this.triggerEvent("select", { id: item.product.id });
    },
  },
});
