import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("account page interaction contract", () => {
  it("auto-saves gender and birthday after picker confirmation", () => {
    const view = readFileSync(
      "miniprogram/package-user/pages/account/index.wxml",
      "utf8",
    );
    const logic = readFileSync(
      "miniprogram/package-user/pages/account/index.ts",
      "utf8",
    );

    expect(view).toContain('bind:change="onGender"');
    expect(view).toContain('bind:change="onBirthday"');
    expect(view).not.toContain("保存性别与生日");
    expect(logic).toContain('void this.saveProfile("性别已保存")');
    expect(logic).toContain('void this.saveProfile("生日已保存")');
    expect(logic).toContain('void this.saveProfile("生日已清除")');
  });

  it("keeps logout only at the bottom of the account page", () => {
    const accountView = readFileSync(
      "miniprogram/package-user/pages/account/index.wxml",
      "utf8",
    );
    const meView = readFileSync("miniprogram/pages/me/index.wxml", "utf8");

    expect(accountView).toContain('bind:tap="logout"');
    expect(accountView).toContain("退出登录");
    expect(meView).not.toContain('slot="right"');
    expect(meView).not.toContain('bind:tap="logout"');
  });
});
