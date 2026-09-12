import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  categoryIconUrl,
  imageUrl,
  splitImages,
} from "../miniprogram/utils/media";
import { getEnvironment } from "../miniprogram/config/env";

describe("imageUrl", () => {
  beforeEach(() =>
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
    }),
  );

  it("保留 HTTPS 绝对地址", () => {
    expect(imageUrl("https://cdn.example.com/a.webp")).toBe(
      "https://cdn.example.com/a.webp",
    );
  });
  it("为服务端相对路径补全资源域名", () => {
    expect(imageUrl("/blogs/a.webp")).toBe(
      "http://127.0.0.1:8081/blogs/a.webp",
    );
  });
  it("为空图片返回本地占位图", () => {
    expect(imageUrl()).toBe("/assets/images/photo-placeholder.png");
  });
  it("保留本地 SVG 资源路径", () => {
    expect(imageUrl("/assets/images/category-food.svg", "category")).toBe(
      "/assets/images/category-food.svg",
    );
  });
  it("旧分类图标使用本地 SVG", () => {
    expect(imageUrl("/types/ms.png", "category")).toBe(
      "/assets/images/category-food.svg",
    );
  });
  it("按分类名称选择对应 SVG", () => {
    expect(categoryIconUrl("/types/unknown.png", "运动健身")).toBe(
      "/assets/images/category-fitness.svg",
    );
    expect(categoryIconUrl("/types/unknown.png", "休闲娱乐")).toBe(
      "/assets/images/category-party.svg",
    );
    expect(categoryIconUrl("/types/unknown.png", "美食")).toBe(
      "/assets/images/category-food.svg",
    );
  });
  it("外部 HTTP 图片升级为 HTTPS", () => {
    expect(imageUrl("http://p0.meituan.net/a.jpg")).toBe(
      "https://p0.meituan.net/a.jpg",
    );
  });
  it("拆分服务端逗号图片列表", () => {
    expect(splitImages("a.jpg, b.jpg,")).toEqual(["a.jpg", "b.jpg"]);
  });
  it("真机开发版使用局域网服务地址", () => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getDeviceInfo: () => ({ platform: "android" }),
    });
    expect(imageUrl("/blogs/a.webp")).toBe(
      getEnvironment().assetBaseUrl + "/blogs/a.webp",
    );
  });
});
