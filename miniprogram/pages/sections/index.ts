import { syncTabBar } from "../../utils/navigation";

Page({
  onShow() {
    syncTabBar(this);
  },
});
