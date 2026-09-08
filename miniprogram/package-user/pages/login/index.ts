import {
  loginByCode,
  loginByPassword,
  registerAndLogin,
  requestAuthCode,
} from "../../../services/auth";
import type { SmsCodeScene } from "../../../types";
import { navigateAfterLogin } from "../../../utils/navigation";

type LoginMode = "SMS" | "REGISTRATION" | "PASSWORD";

Page({
  data: {
    mode: "SMS" as LoginMode,
    phone: "",
    code: "",
    password: "",
    confirmPassword: "",
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
  switchMode(event: WechatMiniprogram.TouchEvent) {
    const mode = String(event.currentTarget.dataset.mode) as LoginMode;
    if (!(["SMS", "REGISTRATION", "PASSWORD"] as LoginMode[]).includes(mode))
      return;
    if (this.timer) clearInterval(this.timer);
    this.setData({
      mode,
      code: "",
      password: "",
      confirmPassword: "",
      countdown: 0,
    });
  },
  onPhone(event: WechatMiniprogram.CustomEvent) {
    this.setData({ phone: this.eventText(event) });
  },
  onCode(event: WechatMiniprogram.CustomEvent) {
    this.setData({ code: this.eventText(event) });
  },
  onPassword(event: WechatMiniprogram.CustomEvent) {
    this.setData({ password: this.eventText(event) });
  },
  onConfirmPassword(event: WechatMiniprogram.CustomEvent) {
    this.setData({ confirmPassword: this.eventText(event) });
  },
  async getCode() {
    if (this.data.codeLoading || this.data.countdown > 0) return;
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) {
      wx.showToast({ title: "请输入正确的手机号", icon: "none" });
      return;
    }
    this.setData({ codeLoading: true });
    try {
      const scene: SmsCodeScene =
        this.data.mode === "REGISTRATION" ? "REGISTRATION" : "LOGIN";
      await requestAuthCode(this.data.phone, scene);
      wx.showToast({ title: "验证码已发送", icon: "success" });
      this.startCountdown();
    } finally {
      this.setData({ codeLoading: false });
    }
  },
  async submit() {
    if (this.data.loading || this.redirecting) return;
    const validation = this.validate();
    if (validation) {
      wx.showToast({ title: validation, icon: "none" });
      return;
    }
    this.setData({ loading: true });
    try {
      if (this.data.mode === "REGISTRATION") {
        await registerAndLogin(
          this.data.phone,
          this.data.code,
          this.data.password,
          this.data.confirmPassword,
        );
      } else if (this.data.mode === "PASSWORD") {
        await loginByPassword(this.data.phone, this.data.password);
      } else {
        await loginByCode(this.data.phone, this.data.code);
      }
      this.selectComponent("#login-motion")?.show(1000);
      this.redirecting = true;
      this.redirectTimer = setTimeout(
        () => navigateAfterLogin(this.redirect),
        700,
      );
    } finally {
      if (!this.redirecting) this.setData({ loading: false });
    }
  },
  validate(): string {
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) return "请输入正确的手机号";
    if (this.data.mode !== "PASSWORD" && !/^\d{6}$/.test(this.data.code))
      return "请输入6位验证码";
    if (this.data.mode !== "SMS") {
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(this.data.password))
        return "密码需为8–64位，且包含字母和数字";
    }
    if (
      this.data.mode === "REGISTRATION" &&
      this.data.password !== this.data.confirmPassword
    )
      return "两次输入的密码不一致";
    return "";
  },
  startCountdown() {
    this.setData({ countdown: 60 });
    this.timer = setInterval(() => {
      const countdown = this.data.countdown - 1;
      this.setData({ countdown });
      if (countdown <= 0 && this.timer) clearInterval(this.timer);
    }, 1000);
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
