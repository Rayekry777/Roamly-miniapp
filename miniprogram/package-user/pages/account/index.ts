import {
  getCurrentProfile,
  replaceAvatar,
  updateNickname,
  updateProfile,
} from "../../../services/user";
import { signOut } from "../../../services/auth";
import { authStore } from "../../../store/auth";
import type { CurrentUserProfile, UserGender } from "../../../types";

const GENDER_OPTIONS: Array<{ label: string; value: UserGender }> = [
  { label: "保密", value: "UNDISCLOSED" },
  { label: "男", value: "MALE" },
  { label: "女", value: "FEMALE" },
];

Page({
  data: {
    profile: null as CurrentUserProfile | null,
    nickname: "",
    genderIndex: 0,
    genderOptions: GENDER_OPTIONS.map((item) => item.label),
    genderLabel: "保密",
    birthday: "",
    today: "",
    loading: true,
    savingNickname: false,
    savingProfile: false,
    savingAvatar: false,
    loggingOut: false,
  },
  onLoad() {
    this.setData({ today: this.today() });
    void this.load();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const result = await getCurrentProfile();
      if (!result.data) throw new Error("个人信息为空");
      this.applyProfile(result.data);
    } finally {
      this.setData({ loading: false });
    }
  },
  onNickname(event: WechatMiniprogram.CustomEvent) {
    this.setData({ nickname: this.eventText(event) });
  },
  async saveNickname() {
    if (this.data.savingNickname || !this.data.profile?.nicknameEditable)
      return;
    const nickname = this.data.nickname.trim();
    if (nickname.length < 2 || nickname.length > 16) {
      wx.showToast({ title: "昵称长度需为2–16个字符", icon: "none" });
      return;
    }
    this.setData({ savingNickname: true });
    try {
      const result = await updateNickname(nickname);
      if (result.data) {
        this.applyProfile(result.data);
        this.syncAuthUser(result.data);
      }
      wx.showToast({ title: "昵称已更新", icon: "success" });
    } finally {
      this.setData({ savingNickname: false });
    }
  },
  onGender(event: WechatMiniprogram.PickerChange) {
    if (this.data.savingProfile || this.data.loggingOut) return;
    const genderIndex = Number(event.detail.value);
    const gender = GENDER_OPTIONS[genderIndex];
    if (!gender || gender.value === this.data.profile?.gender) return;
    this.setData({
      genderIndex,
      genderLabel: gender.label,
    });
    void this.saveProfile("性别已保存");
  },
  onBirthday(event: WechatMiniprogram.PickerChange) {
    if (this.data.savingProfile || this.data.loggingOut) return;
    const birthday = String(event.detail.value || "");
    if (birthday === (this.data.profile?.birthday || "")) return;
    this.setData({ birthday });
    void this.saveProfile("生日已保存");
  },
  clearBirthday() {
    if (this.data.savingProfile || this.data.loggingOut || !this.data.birthday)
      return;
    this.setData({ birthday: "" });
    void this.saveProfile("生日已清除");
  },
  async saveProfile(successTitle: string) {
    if (this.data.savingProfile || this.data.loggingOut) return;
    const previous = this.data.profile;
    this.setData({ savingProfile: true });
    try {
      const gender =
        GENDER_OPTIONS[this.data.genderIndex]?.value || "UNDISCLOSED";
      const result = await updateProfile(gender, this.data.birthday || null);
      if (result.data) this.applyProfile(result.data);
      wx.showToast({ title: successTitle, icon: "success" });
    } catch {
      if (previous) this.applyProfile(previous);
    } finally {
      this.setData({ savingProfile: false });
    }
  },
  chooseAvatar() {
    if (this.data.savingAvatar) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (result) => {
        const path = result.tempFiles[0]?.tempFilePath;
        if (path) void this.saveAvatar(path);
      },
    });
  },
  async saveAvatar(filePath: string) {
    this.setData({ savingAvatar: true });
    try {
      const profile = await replaceAvatar(filePath);
      this.applyProfile(profile);
      wx.showToast({ title: "头像已更新", icon: "success" });
    } finally {
      this.setData({ savingAvatar: false });
    }
  },
  openPhoneChange() {
    wx.navigateTo({ url: "/package-user/pages/phone-change/index" });
  },
  openPasswordChange() {
    wx.navigateTo({ url: "/package-user/pages/password-change/index" });
  },
  async logout() {
    if (this.data.loggingOut || this.data.savingProfile) return;
    this.setData({ loggingOut: true });
    try {
      await signOut();
    } catch {
      /* 请求层已提示错误，signOut 仍会清理本地会话。 */
    }
    wx.reLaunch({
      url: "/pages/me/index",
      fail: () => this.setData({ loggingOut: false }),
    });
  },
  applyProfile(profile: CurrentUserProfile) {
    const genderIndex = Math.max(
      0,
      GENDER_OPTIONS.findIndex((item) => item.value === profile.gender),
    );
    this.setData({
      profile,
      nickname: profile.nickName,
      genderIndex,
      genderLabel: GENDER_OPTIONS[genderIndex]?.label || "保密",
      birthday: profile.birthday || "",
    });
  },
  syncAuthUser(profile: CurrentUserProfile) {
    authStore.user = {
      id: profile.id,
      nickName: profile.nickName,
      icon: profile.icon,
    };
  },
  eventText(event: WechatMiniprogram.CustomEvent): string {
    const detail = event.detail as unknown as string | { value: string };
    return typeof detail === "string" ? detail : detail.value;
  },
  today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  },
});
