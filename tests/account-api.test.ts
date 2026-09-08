import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changePassword,
  changePhone,
  getCurrentProfile,
  getPublicProfile,
  updateAvatar,
  updateNickname,
  updateProfile,
} from "../miniprogram/api/user";

const requestMock = vi.hoisted(() => vi.fn());
vi.mock("../miniprogram/utils/request", () => ({ request: requestMock }));

describe("consumer account APIs", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      code: "OK",
      message: "操作成功",
      data: null,
    });
  });

  it("separates private profile from anonymous public profile", async () => {
    await getCurrentProfile();
    await getPublicProfile("7");

    expect(requestMock).toHaveBeenNthCalledWith(1, "/v1/users/me/profile");
    expect(requestMock).toHaveBeenNthCalledWith(2, "/v1/users/7/profile", {
      auth: "public",
    });
  });

  it("uses dedicated endpoints for profile fields", async () => {
    await updateNickname("新的昵称");
    await updateAvatar("99");
    await updateProfile("UNDISCLOSED", null);

    expect(requestMock).toHaveBeenNthCalledWith(1, "/v1/users/me/nickname", {
      method: "PUT",
      data: { nickName: "新的昵称" },
      dedupe: false,
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, "/v1/users/me/avatar", {
      method: "PUT",
      data: { mediaId: "99" },
      dedupe: false,
    });
    expect(requestMock).toHaveBeenNthCalledWith(3, "/v1/users/me/profile", {
      method: "PUT",
      data: { gender: "UNDISCLOSED", birthday: null },
      dedupe: false,
    });
  });

  it("sends all server-validated security fields", async () => {
    await changePhone("Roamly123", "13900139000", "123456");
    await changePassword("Roamly123", "NewPass123", "NewPass123", "654321");

    expect(requestMock).toHaveBeenNthCalledWith(1, "/v1/users/me/phone", {
      method: "PUT",
      data: {
        currentPassword: "Roamly123",
        newPhone: "13900139000",
        code: "123456",
      },
      dedupe: false,
    });
    expect(requestMock).toHaveBeenNthCalledWith(2, "/v1/users/me/password", {
      method: "PUT",
      data: {
        currentPassword: "Roamly123",
        newPassword: "NewPass123",
        confirmPassword: "NewPass123",
        code: "654321",
      },
      dedupe: false,
    });
  });
});
