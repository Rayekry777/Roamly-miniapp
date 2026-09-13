# Roamly 消费者小程序｜技术栈与解决方案

Roamly 消费者端是原生微信小程序，负责内容浏览、本地生活发现、团购下单、支付、退款、券包和到店核销。它只承载展示、交互和请求编排，价格、优惠、库存、支付结果和券状态全部以 Roamly 后端为准。

## 技术栈

| 领域         | 技术与版本                                             | 用途                                 |
| ------------ | ------------------------------------------------------ | ------------------------------------ |
| 小程序运行时 | 微信原生小程序、WXML/WXSS                              | 页面、分包和微信能力接入             |
| 业务语言     | TypeScript 5.9.3、miniprogram-api-typings 5.2.3        | 页面、API、Service、Store 的静态类型 |
| UI 与动效    | TDesign Miniprogram 1.16.0、Lottie Miniprogram 1.0.12  | 组件、主题令牌和成功动效             |
| 构建与上传   | npm、miniprogram-ci 2.1.31、自定义 `build-npm` 脚本    | 依赖构建和微信上传准备               |
| 质量保障     | ESLint 9.39、Stylelint 16.23、Prettier 3.8、Vitest 4.0 | 类型、脚本、样式、格式和单元测试     |

## 核心解决方案

### 分层与统一数据模型

- `api` 只负责 `/v1` HTTP 调用，`services` 负责业务编排和请求参数归一化，`store` 管理跨页面状态，页面只处理交互和展示。
- 请求层统一注入 `Authorization: Bearer <token>`，将成功响应转换为 `Result` 数据，将错误转换为带业务码的 `ApiError`；204 统一转换为 `data: null`。
- 所有业务 ID 按字符串处理，避免微信端和 JavaScript 对大整数的精度损失；列表按场景使用页码或游标分页。

### 会话、环境与故障恢复

- 手机号验证码登录后保存 Sa-Token 会话，Token 键为 `roamly_satoken_v1`；401 自动清理会话并把私有页面导向登录。
- `miniprogram/config/env.ts` 按开发版、体验版、正式版隔离 API 地址。体验版和正式版的 `apiBaseUrl` 保留 Nginx `/api` 前缀，业务代码只写 `/v1/**`。
- 请求支持超时、网络错误和重复提交保护；页面用请求序列号丢弃过期响应，避免快速切换筛选条件时出现旧数据覆盖新数据。

### 内容流与本地生活体验

- 推荐流、关注流、话题、门店和评论使用游标分页，滚动加载不会因页码漂移重复或遗漏数据。
- 草稿状态、城市选择、关注关系和评论分页分别由专用 Store 管理；媒体先上传取得 `mediaId`，发布内容时只提交已确认的媒体引用。
- 主题色、间距、圆角和状态色集中在 `styles` 令牌，组件通过统一卡片、空状态、导航和成功动画保持跨页面一致。

### 交易链路的客户端边界

- 确认订单页面展示服务端计算的金额和可购数量，客户端不自行计算最终价格或扣减库存。
- 创建订单、支付确认和退款请求携带 `Idempotency-Key`；按钮 loading、请求去重和结果回查共同应对重复点击与网络重试。
- 券码只用于展示给核销方，券的有效期、可退款条件和核销结果由服务端校验；小程序在支付、退款后刷新订单和券包事实。

## 工程结构

```text
miniprogram
├─ api             HTTP 接口封装
├─ services        登录、内容、门店、订单等业务编排
├─ store           会话、城市、Feed、评论和草稿状态
├─ types           Result、分页模型和领域类型
├─ utils           请求、上传、图片、导航等基础能力
├─ components      导航、卡片、空状态和动效组件
├─ styles          Roamly 主题 Token 与公共布局
└─ package-*       用户、内容、门店、订单、券包等业务分包
```

详细页面边界、接口消费和验收标准见[消费者端功能细节说明](docs/消费者端功能细节说明.md)，团购页面视觉参考见[团购券页面视觉对比说明](docs/团购券页面视觉对比说明.md)；跨端接口与交易规则见[后端 README](../Roamly/README.md)。

## 本地开发与验证

```text
npm install
npm run build:npm
npm run verify
```

`build:npm` 会生成微信运行所需的 `miniprogram/miniprogram_npm`。仓库中的 `project.config.json` 使用游客 AppID，真实 AppID 写入被 Git 忽略的 `project.private.config.json`，不要提交真实值。

真机联调时，手机和电脑需在同一局域网；开发版可访问本机 `8081` 服务，并在开发者工具中关闭合法域名校验。开发环境地址或网络变化后，同步调整 `deviceDevelopEnvironment`。

计费与补贴计算统一见 [计费、补贴与结算计算细节](../Roamly/docs/project-details/计费、补贴与结算计算细节.md)，页面操作说明继续维护在本项目对应细节文档。
