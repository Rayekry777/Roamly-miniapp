# Roamly 小程序开发与产品契约

```yaml
version: 4
updatedAt: 2026-09-04
implementationStatus: 已实现（Demo 范围）
deviceAcceptanceStatus: 未确认
backendContract: ../../Roamly/BACKEND_DEVELOPMENT.md
```

## 产品边界

当前小程序已闭环城市、社区动态、评论、商户、点评、团购订单和券包。所有页面消费后端 `/v1` 正式契约，业务 ID 始终按字符串处理。Android/iOS 真机测试尚未确认，不影响 Demo 阶段状态。

已实现页面包括：首页推荐/关注、分区列表/详情、附近商户列表/详情、动态发布/详情、评论线程、商户点评、用户主页、团购商品详情、订单列表/详情、用户券包和用户中心。

## 页面与接口

| 页面 | 主要接口 | 状态 |
|---|---|---|
| 首页 | `/v1/feeds/recommended`、`/v1/feeds/following` | 已实现 |
| 分区 | `/v1/sections`、`/v1/sections/{sectionId}/posts`、关注接口 | 已实现 |
| 发布 | `/v1/media/images`、`/v1/posts` | 已实现 |
| 动态详情 | `/v1/posts/{postId}`、评论与点赞接口 | 已实现 |
| 附近/商户 | `/v1/cities`、`/v1/shops`、`/v1/shops/{shopId}` | 已实现 |
| 商户点评 | `/v1/shops/{shopId}/reviews` | 已实现 |
| 团购商品 | `/v1/shops/{shopId}/voucher-products`、`/v1/voucher-products/{productId}` | 已实现 |
| 订单 | `/v1/voucher-products/{productId}/orders`、`/v1/users/me/orders/**` | 已实现 |
| 券包 | `/v1/users/me/vouchers/**` | 已实现 |

## 关键适配规则

- 订单状态使用后端权威值 `PENDING_PAYMENT | PAID | CANCELED | REFUNDING | REFUNDED`，筛选和文案均使用 `CANCELED`。
- 商品详情服务消费 `{ product, shop }`，订单详情服务消费 `{ order, product, shop }`，页面同时展示商品摘要与真实商户摘要，并可跳转商户详情。
- 列表空数据保持真实空态；只有响应结构不符合契约时才报告“响应格式异常”，不再使用历史升级兜底文案。
- 401 清理登录态但保留发布草稿；登录后恢复原页面和意图。
- 网络失败、定位拒绝、上传失败、服务端 4xx/5xx 均显示真实错误和可重试入口，不生成假数据。

## 验证

在 `Roamly-miniapp` 根目录执行：

```text
npm run build:npm
npm run verify
```

2026-09-04 最终验证：`npm run verify` 通过 33 个测试文件、120 项测试；覆盖 API 路径、Bearer/登录恢复、页面状态机、评论/点评、`CANCELED`、详情包装和字符串大 ID。设备验收状态为“未确认”。

## 明确非目标

搜索、通知、举报、审核、真实支付回调、退款、核销、商户后台、角色权限和生产短信供应商不在当前小程序 Demo 范围。
