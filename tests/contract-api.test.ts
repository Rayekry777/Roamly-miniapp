import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCities } from "../miniprogram/api/city";
import {
  listFollowingPosts,
  listRecommendedPosts,
} from "../miniprogram/api/feed";
import { createPost, getPost, likePost } from "../miniprogram/api/post";
import {
  followSection,
  listSectionPosts,
  listSections,
} from "../miniprogram/api/section";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("../miniprogram/utils/request", () => ({ request: requestMock }));

describe("new product contract APIs", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      code: "OK",
      message: "操作成功",
      data: null,
    });
  });

  it("uses public city endpoint", async () => {
    await listCities();

    expect(requestMock).toHaveBeenCalledWith("/v1/cities", {
      auth: "public",
    });
  });

  it("uses optional auth for all sections and required auth for followed sections", async () => {
    await listSections();
    await listSections({ followedOnly: true });

    expect(requestMock).toHaveBeenNthCalledWith(1, "/v1/sections", {
      auth: "optional",
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, "/v1/sections", {
      data: { followedOnly: true },
      auth: "required",
    });
  });

  it("omits absent cursor fields from a section request", async () => {
    await listSectionPosts("section-1", {
      cityCode: "HANGZHOU",
      sort: "HOT",
      size: 20,
    });

    expect(requestMock).toHaveBeenCalledWith("/v1/sections/section-1/posts", {
      data: { cityCode: "HANGZHOU", sort: "HOT", size: 20 },
      auth: "optional",
    });
  });

  it("keeps ordinary post payload free of hidden shop fields", async () => {
    await createPost({
      content: "今天沿着河边散步。",
      mediaIds: ["9223372036854775807"],
      shopVisit: false,
    });

    expect(requestMock).toHaveBeenCalledWith("/v1/posts", {
      method: "POST",
      data: {
        content: "今天沿着河边散步。",
        mediaIds: ["9223372036854775807"],
        shopVisit: false,
      },
      dedupe: false,
    });
  });

  it("uses optional auth for recommendation and details", async () => {
    await listRecommendedPosts({ cityCode: "HANGZHOU", offset: 0 });
    await getPost("9223372036854775807");

    expect(requestMock).toHaveBeenNthCalledWith(1, "/v1/feeds/recommended", {
      data: { cityCode: "HANGZHOU", offset: 0 },
      auth: "optional",
    });
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      "/v1/posts/9223372036854775807",
      { auth: "optional" },
    );
  });

  it("keeps following and write actions authenticated", async () => {
    await listFollowingPosts();
    await followSection("section-1");
    await likePost("post-1");

    expect(requestMock).toHaveBeenNthCalledWith(1, "/v1/feeds/following", {
      data: {},
    });
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      "/v1/users/me/section-follows/section-1",
      { method: "PUT", dedupe: false },
    );
    expect(requestMock).toHaveBeenNthCalledWith(3, "/v1/posts/post-1/like", {
      method: "PUT",
      dedupe: false,
    });
  });
});
