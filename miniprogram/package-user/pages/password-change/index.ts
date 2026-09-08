import {
  changePassword,
  getCurrentProfile,
  sendPasswordChangeCode,
} from "../../../services/user";
import { authStore } from "../../../store/auth";

Page({
  data: {
    phone: "",
    code: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    countdown: 0,
    loading: false,
    codeLoading: false,
  },
  onLoad() {
    void this.load();
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer);
  },
  async load() {
    const result = await getCurrentProfile();
    if (result.data) this.setData({ phone: result.data.phone });
  },
  onValue(event: WechatMiniprogram.CustomEvent) {
    const field = String(event.currentTarget.dataset.field || "");
    const detail = event.detail as unknown as string | { value: string };
    this.setData({
      [field]: typeof detail === "string" ? detail : detail.value,
    });
  },
  async getCode() {
    if (this.data.codeLoading || this.data.countdown > 0) return;
    this.setData({ codeLoading: true });
    try {
      await sendPasswordChangeCode();
      wx.showToast({ title: "验证码已发送", icon: "success" });
      this.startCountdown();
    } finally {
      this.setData({ codeLoading: false });
    }
  },
  async submit() {
    if (this.data.loading) return;
    if (
      !this.data.currentPassword ||
      !/^\d{6}$/.test(this.data.code) ||
      !/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(this.data.newPassword)
    ) {
      wx.showToast({ title: "请按要求填写密码和验证码", icon: "none" });
      return;
    }
    if (this.data.newPassword !== this.data.confirmPassword) {
      wx.showToast({ title: "两次输入的新密码不一致", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    try {
      await changePassword(
        this.data.currentPassword,
        this.data.newPassword,
        this.data.confirmPassword,
        this.data.code,
      );
      authStore.clear();
      wx.redirectTo({ url: "/package-user/pages/login/index" });
    } finally {
      this.setData({ loading: false });
    }
  },
  startCountdown() {
    this.setData({ countdown: 60 });
    this.timer = setInterval(() => {
      const countdown = this.data.countdown - 1;
      this.setData({ countdown });
      if (countdown <= 0 && this.timer) clearInterval(this.timer);
    }, 1000);
  },
  timer: undefined as ReturnType<typeof setInterval> | undefined,
});
