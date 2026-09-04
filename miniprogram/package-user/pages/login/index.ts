import { loginByCode, requestLoginCode } from "../../../services/auth";
import { navigateAfterLogin } from "../../../utils/navigation";

Page({
  data: {
    phone: "",
    code: "",
    countdown: 0,
    loading: false,
    codeLoading: false,
  },
  onLoad(options) {
    this.redirect = options.redirect
      ? decodeURIComponent(options.redirect)
      : "/pages/home/index";
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer);
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  },
  onPhone(event: WechatMiniprogram.CustomEvent) {
    this.setData({ phone: this.eventText(event) });
  },
  onCode(event: WechatMiniprogram.CustomEvent) {
    this.setData({ code: this.eventText(event) });
  },
  async getCode() {
    if (this.data.codeLoading || this.data.countdown > 0) return;
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) {
      wx.showToast({ title: "请输入正确的手机号", icon: "none" });
      return;
    }
    this.setData({ codeLoading: true });
    try {
      await requestLoginCode(this.data.phone);
      wx.showToast({ title: "验证码已发送", icon: "success" });
      this.setData({ countdown: 60 });
      this.timer = setInterval(() => {
        const countdown = this.data.countdown - 1;
        this.setData({ countdown });
        if (countdown <= 0 && this.timer) clearInterval(this.timer);
      }, 1000);
    } catch {
      return;
    } finally {
      this.setData({ codeLoading: false });
    }
  },
  async submit() {
    if (this.data.loading || this.redirecting) return;
    if (
      !/^1[3-9]\d{9}$/.test(this.data.phone) ||
      !/^\d{6}$/.test(this.data.code)
    ) {
      wx.showToast({ title: "请填写正确的手机号和验证码", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    try {
      await loginByCode(this.data.phone, this.data.code);
      this.selectComponent("#login-motion")?.show(1000);
      this.redirecting = true;
      this.redirectTimer = setTimeout(
        () => navigateAfterLogin(this.redirect),
        700,
      );
    } catch {
      return;
    } finally {
      if (!this.redirecting) this.setData({ loading: false });
    }
  },
  eventText(event: WechatMiniprogram.CustomEvent): string {
    const detail = event.detail as unknown as string | { value: string };
    return typeof detail === "string" ? detail : detail.value;
  },
  redirect: "/pages/home/index",
  timer: undefined as ReturnType<typeof setInterval> | undefined,
  redirectTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  redirecting: false,
});
