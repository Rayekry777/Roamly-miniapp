import { ensureLocatedCity } from "../../../services/city";
import {
  deleteTemporaryImage,
  uploadTemporaryImage,
} from "../../../services/media";
import {
  DraftSubmissionError,
  publishPost,
  validatePostDraft,
} from "../../../services/post";
import { loadHomeSections } from "../../../services/feed";
import { listPublishShopOptions } from "../../../services/shop";
import { feedStore } from "../../../store/feed";
import { postDraftStore } from "../../../store/post-draft";
import type { SectionSummary, ShopSummary } from "../../../types";
import {
  editImageForUpload,
  imageFileSize,
  isImageEditCanceled,
  prepareImageForEdit,
} from "../../../utils/image";
import { imageUrl } from "../../../utils/media";
import { choosePostImages, validatePostImage } from "../../../utils/post-media";
import { createRequestScope } from "../../../utils/scope";

Page({
  data: {
    draft: postDraftStore.getState(),
    sections: [] as SectionSummary[],
    shops: [] as ShopSummary[],
    keyword: "",
    optionLoading: true,
    shopLoading: false,
    optionError: "",
    shopError: "",
    selectedSectionId: "",
    selectedShopId: "",
  },
  onLoad() {
    this.scope = createRequestScope();
    postDraftStore.restore();
    this.syncDraft();
    void this.loadOptions();
  },
  onUnload() {
    this.unloaded = true;
    this.scope?.close();
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  },
  onTitle(event: WechatMiniprogram.CustomEvent) {
    postDraftStore.updateText("title", this.eventText(event));
    this.syncDraft();
  },
  onContent(event: WechatMiniprogram.CustomEvent) {
    postDraftStore.updateText("content", this.eventText(event));
    this.syncDraft();
  },
  onShopVisitChange(event: WechatMiniprogram.CustomEvent<{ value: boolean }>) {
    const shopVisit = Boolean(event.detail.value);
    postDraftStore.setShopVisit(shopVisit);
    this.syncDraft();
    if (shopVisit && !this.data.shops.length) void this.loadShops();
  },
  selectSection(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const section = this.data.sections.find((item) => item.id === id) || null;
    postDraftStore.selectSection(section);
    this.syncDraft();
  },
  onKeyword(event: WechatMiniprogram.CustomEvent) {
    const keyword = this.eventText(event);
    this.setData({ keyword });
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadShops(), 350);
  },
  selectShop(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const shop = this.data.shops.find((item) => item.id === id) || null;
    postDraftStore.selectShop(shop);
    this.syncDraft();
  },
  clearShop() {
    postDraftStore.selectShop(null);
    this.syncDraft();
  },
  async addImages() {
    if (this.data.draft.submitting) return;
    const available = 9 - this.data.draft.media.length;
    if (available <= 0) return;

    try {
      const selection = await choosePostImages(available);
      if (selection.rejectedMessages[0]) {
        wx.showToast({
          title: selection.rejectedMessages[0],
          icon: "none",
        });
      }
      const added = postDraftStore.addMedia(
        selection.files.map((file) => file.tempFilePath),
      );
      this.syncDraft();
      await Promise.all(added.map((item) => this.uploadOne(item.localPath)));
    } catch (error) {
      if (!this.isUserCancel(error)) {
        wx.showToast({ title: "选择图片失败", icon: "none" });
      }
    }
  },
  retryImage(event: WechatMiniprogram.CustomEvent<{ path: string }>) {
    void this.uploadOne(event.detail.path);
  },
  async editImage(
    event: WechatMiniprogram.CustomEvent<{ path: string; url?: string }>,
  ) {
    if (this.data.draft.submitting) return;
    const localPath = event.detail.path;
    const previous = postDraftStore
      .getState()
      .media.find((item) => item.localPath === localPath);
    if (!previous) return;
    if (previous.status === "UPLOADING") {
      wx.showToast({ title: "图片上传完成后再编辑", icon: "none" });
      return;
    }
    try {
      // 草稿可能跨页面/跨启动恢复，微信原临时文件已失效时改用已上传
      // 的公开媒体地址下载到新的临时文件，再交给系统编辑器，避免编辑器
      // 打开失效路径后出现白底或空白结果。
      const editablePath = await prepareImageForEdit(
        localPath,
        event.detail.url ||
          (previous.asset ? imageUrl(previous.asset.url) : ""),
      );
      const editedPath = await editImageForUpload(editablePath);
      // 部分微信版本在未做任何操作时会原样返回输入路径；此时无需重复
      // 上传、替换媒体或产生新的临时记录。
      if (editedPath === editablePath) {
        wx.showToast({ title: "图片未修改", icon: "none" });
        return;
      }
      const validation = await validatePostImage({
        tempFilePath: editedPath,
        size: imageFileSize(editedPath),
      } as WechatMiniprogram.MediaFile);
      if (validation) {
        wx.showToast({ title: validation, icon: "none" });
        return;
      }
      const asset = await uploadTemporaryImage(editedPath, "POST");
      const stillExists = postDraftStore
        .getState()
        .media.some((item) => item.localPath === localPath);
      if (!stillExists) {
        await deleteTemporaryImage(asset.id).catch(() => undefined);
        return;
      }
      postDraftStore.replaceMedia(localPath, {
        localPath: editedPath,
        asset,
        status: "DONE",
      });
      this.syncDraft();
      if (previous.asset) {
        await deleteTemporaryImage(previous.asset.id).catch(() => undefined);
      }
    } catch (error) {
      if (!isImageEditCanceled(error)) {
        wx.showToast({ title: this.errorMessage(error), icon: "none" });
      }
    }
  },
  async removeImage(event: WechatMiniprogram.CustomEvent<{ path: string }>) {
    const removed = postDraftStore.removeMedia(event.detail.path);
    this.syncDraft();
    if (removed?.asset) {
      await deleteTemporaryImage(removed.asset.id).catch(() => undefined);
    }
  },
  moveImage(
    event: WechatMiniprogram.CustomEvent<{
      path: string;
      direction: -1 | 1;
    }>,
  ) {
    postDraftStore.moveMedia(event.detail.path, event.detail.direction);
    this.syncDraft();
  },
  async uploadOne(localPath: string) {
    postDraftStore.updateMedia(localPath, {
      status: "UPLOADING",
      error: undefined,
    });
    this.syncDraft();
    try {
      const asset = await uploadTemporaryImage(localPath, "POST");
      const stillExists = postDraftStore
        .getState()
        .media.some((item) => item.localPath === localPath);
      if (!stillExists) {
        await deleteTemporaryImage(asset.id).catch(() => undefined);
        return;
      }
      postDraftStore.updateMedia(localPath, {
        asset,
        status: "DONE",
        error: undefined,
      });
    } catch (error) {
      postDraftStore.updateMedia(localPath, {
        status: "FAILED",
        error: this.errorMessage(error),
      });
    } finally {
      this.syncDraft();
    }
  },
  async submit() {
    const draft = postDraftStore.getState();
    if (draft.submitting) return;
    const error = validatePostDraft(draft);
    if (error) {
      wx.showToast({ title: error.message, icon: "none" });
      wx.pageScrollTo({ selector: `#field-${error.field}`, duration: 200 });
      return;
    }

    postDraftStore.setSubmitting(true);
    this.syncDraft();
    try {
      await publishPost(draft);
      this.published = true;
      wx.disableAlertBeforeUnload?.();
      postDraftStore.clear();
      feedStore.resetFeed("RECOMMENDED");
      feedStore.setMode("RECOMMENDED");
      this.syncDraft();
      this.selectComponent("#publish-motion")?.show(1200);
      this.redirectTimer = setTimeout(
        () => wx.switchTab({ url: "/pages/home/index" }),
        850,
      );
    } catch (error) {
      const submissionError =
        error instanceof DraftSubmissionError
          ? error
          : new DraftSubmissionError(this.errorMessage(error));
      wx.showToast({ title: submissionError.message, icon: "none" });
      if (submissionError.field) {
        wx.pageScrollTo({
          selector: `#field-${submissionError.field}`,
          duration: 200,
        });
      }
    } finally {
      postDraftStore.setSubmitting(false);
      this.syncDraft();
    }
  },
  leave() {
    if (this.data.draft.submitting) {
      wx.showToast({ title: "正在发布，请稍候", icon: "none" });
      return;
    }
    if (!postDraftStore.hasContent()) {
      wx.navigateBack();
      return;
    }
    wx.showActionSheet({
      itemList: ["保存草稿并退出", "放弃并清理"],
      success: (result) => {
        if (result.tapIndex === 0) this.saveAndLeave();
        if (result.tapIndex === 1) void this.discardAndLeave();
      },
    });
  },
  saveAndLeave() {
    wx.disableAlertBeforeUnload?.();
    wx.navigateBack();
  },
  async discardAndLeave() {
    const assets = postDraftStore
      .getState()
      .media.map((item) => item.asset?.id)
      .filter((id): id is string => Boolean(id));
    postDraftStore.clear();
    this.syncDraft();
    await Promise.all(
      assets.map((id) => deleteTemporaryImage(id).catch(() => undefined)),
    );
    wx.disableAlertBeforeUnload?.();
    wx.navigateBack();
  },
  async loadOptions() {
    try {
      const [sections, city] = await Promise.all([
        this.scope?.run(loadHomeSections()),
        this.scope?.run(ensureLocatedCity()),
      ]);
      if (!sections || !city) return;
      const availableSections = sections.filter((item) => item.allowShopVisit);
      this.cityCode = city.code;
      this.setData({
        sections: availableSections,
        optionLoading: false,
        optionError: "",
      });
      const selected = postDraftStore.getState().section;
      if (selected) {
        const canonical =
          availableSections.find((item) => item.id === selected.id) || null;
        postDraftStore.selectSection(canonical);
        this.syncDraft();
      }
      if (this.data.draft.shopVisit) await this.loadShops();
    } catch (error) {
      this.setData({
        optionLoading: false,
        optionError: this.errorMessage(error),
      });
    }
  },
  async loadShops() {
    if (!this.cityCode) return;
    const sequence = ++this.shopRequestSequence;
    this.setData({ shopLoading: true, shopError: "" });
    try {
      const shops = await this.scope?.run(
        listPublishShopOptions({
          cityCode: this.cityCode,
          keyword: this.data.keyword,
        }),
      );
      if (shops && sequence === this.shopRequestSequence) {
        this.setData({ shops });
      }
    } catch (error) {
      if (sequence === this.shopRequestSequence) {
        this.setData({
          shops: [],
          shopError: this.errorMessage(error),
        });
      }
    } finally {
      if (sequence === this.shopRequestSequence) {
        this.setData({ shopLoading: false });
      }
    }
  },
  syncDraft() {
    if (this.unloaded) return;
    const draft = postDraftStore.getState();
    this.setData({
      draft,
      selectedSectionId: draft.section?.id || "",
      selectedShopId: draft.shop?.id || "",
    });
    if (postDraftStore.hasContent() && !this.published) {
      wx.enableAlertBeforeUnload?.({
        message: "发布内容已保存为草稿，请确认是否离开。",
      });
    } else if (!this.published) {
      wx.disableAlertBeforeUnload?.();
    }
  },
  eventText(event: WechatMiniprogram.CustomEvent): string {
    const detail = event.detail as unknown as string | { value: string };
    return typeof detail === "string" ? detail : detail.value;
  },
  errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "操作失败，请稍后重试";
  },
  isUserCancel(error: unknown): boolean {
    const message =
      error instanceof Error
        ? error.message
        : String((error as { errMsg?: string })?.errMsg || "");
    return message.toLowerCase().includes("cancel");
  },
  scope: undefined as ReturnType<typeof createRequestScope> | undefined,
  cityCode: "",
  searchTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  redirectTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  shopRequestSequence: 0,
  published: false,
  unloaded: false,
});
