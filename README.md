# Roamly Miniapp

Roamly 原生微信小程序客户端。业务请求路径统一使用 `/v1`；体验版和正式版基础地址包含 Nginx `/api` 前缀，组合后的公开地址为 `/api/v1`。手机号验证码登录成功后保存 Sa-Token 会话，并统一发送 `Authorization: Bearer <token>`。所有业务 ID 均按字符串处理。

## 开发命令

```text
npm install
npm run build:npm
npm run verify
```

`npm run build:npm` 会生成微信运行所需的 `miniprogram/miniprogram_npm`；依赖变化后重新执行。环境地址在 `miniprogram/config/env.ts` 中按开发版、体验版、正式版分层配置；体验版和正式版 `apiBaseUrl` 必须保留末尾 `/api`，上传前还要将占位域名替换为已备案 HTTPS 合法域名。

仓库中的 `project.config.json` 使用微信游客 AppID。真实 AppID 写入已忽略的 `project.private.config.json`，可从 `project.private.config.example.json` 复制本地配置，禁止提交真实值。

## 真机调试

开发者工具访问 `http://127.0.0.1:8081`，开发版真机访问当前电脑 Wi-Fi 地址 `http://192.168.2.109:8081`。手机和电脑需要位于同一局域网，并在微信开发者工具中关闭合法域名校验。电脑网络变化后，应同步更新 `miniprogram/config/env.ts` 中的 `deviceDevelopEnvironment`。

Spring Boot 必须监听非回环网卡，Windows 防火墙仅需允许本地子网访问 Java 的 TCP 8081。可先在手机浏览器打开 `http://192.168.2.109:8081/v1/shop-types`，确认返回 `code: "OK"` 后再进行真机调试。

## 目录

- `api`：HTTP 接口封装
- `services`：登录等业务流程
- `store`：会话和用户状态
- `types`：接口模型
- `utils`：请求、上传、图片和导航
- `components`：统一导航、卡片、空状态和成功动画
- `styles`：主题 Token 与公共布局
- `package-*`：商户、笔记和用户分包

详细消费者页面、交互、接口消费、视觉和分阶段实施契约见 [消费者小程序契约](docs/MINIAPP_DEVELOPMENT.md)。

阶段 22 已完成消费者确认订单、服务端计价、数量步进和幂等下单；阶段 23 至 27 的 15 分钟倒计时、Mock 支付、多份发券、退款和动态二维码已完成设计冻结，按路线图继续推进。实施顺序见 [四端交付路线图](../Roamly/docs/roadmap/FOUR_END_DELIVERY_ROADMAP.md)。

## 会话迁移

- 本地 Token 键为 `roamly_satoken_v1`，旧 Token 不迁移，升级后需重新登录。
- 401 会清除 Token 和用户状态，并在私有页面跳转登录。
- 成功响应为 `{code,message,data}`；TypeScript 模型统一使用 `Result`、`ErrorResult`、`PageResult` 和 `CursorPageResult`，204 由请求层转换为 `data: null`。
- 页码分页与关注流由 API 层适配现有页面，页面不直接解析旧版响应。
