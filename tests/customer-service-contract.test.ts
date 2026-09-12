import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("阶段 41 消费者客服契约", () => {
  it("注册平台客服列表、创建和会话页面", () => {
    const app = JSON.parse(readFileSync("miniprogram/app.json", "utf8")) as {
      subpackages: Array<{ root: string; pages: string[] }>;
    };
    const user = app.subpackages.find((item) => item.root === "package-user");
    expect(user?.pages).toEqual(
      expect.arrayContaining([
        "pages/customer-service/index",
        "pages/customer-service/create",
        "pages/customer-service/detail",
      ]),
    );
  });

  it("会话支持私有图片、关闭重开和未读入口", () => {
    const api = readFileSync("miniprogram/api/customer-service.ts", "utf8");
    const detail = readFileSync(
      "miniprogram/package-user/pages/customer-service/detail.wxml",
      "utf8",
    );
    const list = readFileSync(
      "miniprogram/package-user/pages/customer-service/index.wxml",
      "utf8",
    );
    expect(api).toContain("/closure");
    expect(api).toContain("/reopening");
    expect(api).toContain("/attachments/");
    expect(detail).toContain("添加图片");
    expect(detail).toContain("重新打开");
    expect(list).toContain("条新消息");
  });

  it("退款详情消费审核、执行和服务端时间线", () => {
    const source = readFileSync(
      "miniprogram/package-order/pages/refund-detail/index.ts",
      "utf8",
    );
    expect(source).toContain("decisionStatus");
    expect(source).toContain("executionStatus");
    expect(source).toContain("getMyRefundTimeline");
  });
});
