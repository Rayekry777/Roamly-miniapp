# Roamly 微信小程序开发与产品契约

```yaml
version: 3
updatedAt: 2026-09-02
scope: 分区社区、Threads 式评论、附近商户、点评、团购订单与券包
reviewStatus: draft
implementationStatus: 未实现
```

## 1. 文档定位

本文档是 Roamly 小程序页面、组件、状态、API 调用和交互行为的实现契约。后端接口、目标数据库、鉴权、事务、迁移和阶段总状态见后端项目 `docs/BACKEND_DEVELOPMENT.md`。

- 当前首页、五入口导航和统一发布器已经切换到 Post 契约；旧 Blog 详情与兼容页面仍保留。
- 新导航、Post 首页、发布器、分区列表、分区详情、Post 详情、Threads 评论界面、附近商户和商户聚合详情已经实现；后端评论、商户扩展、点评和券包接口继续按阶段推进。
- OpenAPI 是 HTTP 契约真源；本文件说明小程序如何消费接口，不复制后端全部数据库字段。
- 状态只使用“未确认、未实现、开发中、已实现、已废弃”。
- 每个阶段开始前必须冻结页面状态机、接口类型、失败恢复和验收用例。

## 2. 当前工程基线

- 技术栈：原生微信小程序、TypeScript、WXML、WXSS、TDesign MiniProgram 1.16.0、lottie-miniprogram 1.0.12。
- 渲染器：WebView，不迁移 Skyline。
- 当前分层：`api / services / store / types / utils / components / pages / package-*`。
- 当前自定义 TabBar 已显示“首页 / 分区 / 发布 / 附近 / 我的”，发布为中央操作按钮。
- 当前社区首页和发布模型为 `Post`，图片先上传为临时媒体并提交字符串 `mediaIds`；旧 Blog 页面尚未退役。
- 当前 Post 详情、探店商户连接和评论交互界面已经完成；后端评论接口未实现，旧 Blog 详情仍提供过渡读取能力。
- 当前鉴权为 Sa-Token Bearer，所有业务 ID 已按字符串处理。
- 当前 `.idea` 取消 Git 跟踪的暂存变更属于用户改动，后续实现不得撤销或覆盖。

## 3. 目标产品与视觉方向

首页采用“小黑盒分区信息架构 + Threads 内容和回复体验”的混合方式：

- 顶部为“关注 / 推荐”。
- 下方横向展示关注或常用官方分区。
- 主体为轻量、连续的动态信息流。
- 每条动态左下角显示可点击分区标签。
- 有合格热门评论时，在卡片底部展示一条评论摘要。
- 探店动态详情在正文和图片下方、评论上方显示商户连接。

只借鉴信息层级和交互原则，不复制第三方品牌、图标、素材、布局尺寸和专有视觉。

## 4. 信息架构与路由

### 4.1 底部导航

```text
首页 / 分区 / 发布 / 附近 / 我的
```

- “发布”是中央操作按钮，点击后进入发布分包，不是一个持久 Tab 页面。
- 首页、分区、附近允许匿名进入。
- 我的允许匿名进入，但显示登录引导；个人资产入口需要登录。
- 发布必须登录，登录成功后返回发布页。

### 4.2 目标页面

| 路由                                   | 用途              | 鉴权               | 状态   |
| -------------------------------------- | ----------------- | ------------------ | ------ |
| `/pages/home/index`                    | 推荐/关注信息流   | 推荐公开，关注登录 | 已实现 |
| `/pages/sections/index`                | 官方分区列表      | 公开，可选登录态   | 已实现 |
| `/pages/nearby/index`                  | 附近商户          | 公开               | 已实现 |
| `/pages/me/index`                      | 用户中心          | 可匿名外壳         | 未实现 |
| `/package-post/pages/detail/index`     | 动态详情和评论串  | 公开，可选登录态   | 已实现 |
| `/package-post/pages/publish/index`    | 统一发布器        | 登录               | 已实现 |
| `/package-post/pages/mine/index`       | 我的动态          | 登录               | 未实现 |
| `/package-section/pages/detail/index`  | 分区最新/热门动态 | 公开               | 已实现 |
| `/package-shop/pages/list/index`       | 商户筛选列表      | 公开               | 已实现 |
| `/package-shop/pages/detail/index`     | 商户聚合详情      | 公开               | 已实现 |
| `/package-shop/pages/reviews/index`    | 商户点评列表      | 公开，写入登录     | 未实现 |
| `/package-voucher/pages/product/index` | 团购商品详情      | 公开               | 未实现 |
| `/package-voucher/pages/wallet/index`  | 用户券包          | 登录               | 未实现 |
| `/package-order/pages/list/index`      | 我的订单          | 登录               | 未实现 |
| `/package-order/pages/detail/index`    | 订单详情          | 登录               | 未实现 |
| `/package-user/pages/login/index`      | 手机验证码登录    | 公开               | 已实现 |
| `/package-user/pages/profile/index`    | 用户主页          | 公开               | 未实现 |

迁移关系：

- `pages/discover` 替换为 `pages/sections`。
- `pages/following` 合并进首页顶部“关注”标签后废弃。
- `package-blog` 迁移为 `package-post`。
- 旧“探店”列表能力迁移到分区动态和商户关联动态。

## 5. 前端分层契约

```text
api        只声明 HTTP 路径、方法、鉴权模式、请求和响应类型
services   组合多个接口、做纯数据适配、封装跨接口业务流程
store      登录、城市、信息流缓存和发布草稿等跨页状态
types      与 OpenAPI 对齐的 Request、VO、分页和错误类型
utils      请求、上传、导航、媒体解析、分页去重和作用域控制
components 可复用视图，不直接拼业务 URL
pages      页面状态机、生命周期和交互编排
```

约束：

- 页面不能直接调用 `wx.request`、`wx.uploadFile` 或拼接 API 地址。
- `api` 不弹 Toast、不跳转页面、不修改 Store。
- `services` 不依赖具体页面实例。
- 组件通过 properties、events 和 slots 交互，不直接操作页面 Store。
- 不引入新的全局状态管理框架，保持轻量 TypeScript Store。
- 所有 Long ID 类型必须是 `string`，禁止转为 `number`。

## 6. 公共类型契约

### 6.1 响应与分页

```ts
interface Result<T> {
  code: string;
  message: string;
  data: T | null;
}

interface ErrorResult {
  code: string;
  message: string;
  fieldErrors?: Array<{ field: string; message: string }>;
}

interface PageResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

interface CursorPageResult<T> {
  items: T[];
  nextCursor: number | null;
  nextOffset: number;
  hasMore: boolean;
}
```

客户端只透传游标，不解析其业务含义。分页合并必须按资源 ID 去重。

### 6.2 主要展示类型

```ts
interface City {
  code: string;
  name: string;
}

interface SectionSummary {
  id: string;
  code: string;
  name: string;
  icon?: string;
  allowShopVisit: boolean;
  followedByMe: boolean;
}

interface UserSummary {
  id: string;
  nickName: string;
  icon?: string;
}

interface MediaAsset {
  id: string;
  url: string;
  width?: number;
  height?: number;
  mimeType: string;
  size: number;
}

interface PostMedia {
  id: string;
  url: string;
  width?: number;
  height?: number;
  mimeType: string;
}

interface HighlightComment {
  id: string;
  author: UserSummary;
  content: string;
  likedCount: number;
  replyCount: number;
}

interface PostCard {
  id: string;
  author: UserSummary;
  section: SectionSummary;
  title?: string;
  contentPreview: string;
  media: PostMedia[];
  shopVisit: boolean;
  likedCount: number;
  commentCount: number;
  likedByMe: boolean;
  followingAuthor: boolean;
  highlightComment?: HighlightComment;
  createdTime: string;
}

interface PostDetail extends PostCard {
  content: string;
  shop?: ShopSummary;
  editable: boolean;
  deletable: boolean;
  defaultCommentSort: "HOT" | "LATEST";
}

type CommentStatus = "NORMAL" | "DELETED";

interface PostComment {
  id: string;
  postId: string;
  author: UserSummary;
  rootId?: string;
  parentId?: string;
  replyToUser?: UserSummary;
  content: string;
  likedCount: number;
  replyCount: number;
  likedByMe: boolean;
  status: CommentStatus;
  createdTime: string;
}

interface CommentThread {
  root: PostComment;
  replies: PostComment[];
  replyCount: number;
  hasMoreReplies: boolean;
  nextReplyCursor: number | null;
  nextReplyOffset: number;
}
```

后端没有返回的可选字段必须按缺失处理，不能用空字符串伪造对象。

## 7. 请求、会话和环境

### 7.1 URL 规则

- 业务方法只传 `/v1/**`。
- `develop.apiBaseUrl` 直连 Spring Boot，不包含 `/api`。
- `trial`、`release` 的 `apiBaseUrl` 包含 Nginx `/api`。
- `assetBaseUrl` 始终是资源源站，不包含 `/api`。
- 后端返回相对资源路径时，由统一媒体工具拼接 `assetBaseUrl`。
- 页面和组件禁止自行拼资源域名。

示例：

```text
apiBaseUrl=https://example.com/api + /v1/posts
→ https://example.com/api/v1/posts

assetBaseUrl=https://example.com + /blogs/2026/09/a.webp
→ https://example.com/blogs/2026/09/a.webp
```

### 7.2 鉴权

- Token 本地键继续为 `roamly_satoken_v1`。
- 私有和可选鉴权请求发送 `Authorization: Bearer <token>`。
- 公共请求不发送 Token；需要 `likedByMe` 等个性化字段的读取接口使用 `optional`。
- 私有请求发起前无 Token：保存当前路由和用户意图，跳转登录。
- 私有请求返回 401：清除 Token 和用户状态，保留非敏感发布草稿，再跳转登录。
- 可选鉴权请求返回 401：清理失效会话，但页面继续以匿名状态展示，不强制跳转。
- 登录成功后优先恢复原页面和原意图；无法恢复时进入首页。

### 7.3 错误处理

- 网络失败：显示页面级错误和重试入口。
- 请求超时：提示“请求超时，请稍后重试”。
- 400：优先展示第一个 `fieldErrors`，并将对应表单字段标红。
- 401：由会话层统一处理。
- 403：提示无操作权限，不重试原写操作。
- 404：详情页展示资源不存在状态，列表中的失效项移除。
- 409：按业务码展示，例如重复点评时引导编辑原点评。
- 413：提示图片超限并保留其他已选图片。
- 500：展示通用错误和重试，不显示服务端堆栈信息。

### 7.4 请求去重和取消

- GET 请求按方法、路径、查询参数去重。
- POST、PUT、DELETE 默认不去重，由页面 `submitting`、`liking` 等状态防止重复操作。
- 页面卸载时关闭请求作用域，迟到响应不得覆盖新页面或新筛选条件。
- 搜索输入使用防抖，并通过请求序号丢弃旧响应。

## 8. Store 设计

### 8.1 AuthStore

保存 Token、当前用户和会话状态；不得保存验证码、完整手机号或其他敏感日志。

### 8.2 CityStore

```ts
interface CityState {
  selectedCity: City | null;
  longitude?: number;
  latitude?: number;
  locationStatus: "IDLE" | "LOCATING" | "READY" | "DENIED" | "FAILED";
}
```

- 首次进入尝试定位并映射城市；失败时使用首发默认城市。
- 用户手动切换城市后，不再被后台定位结果覆盖。
- 坐标只用于附近和距离展示，不持久化精确位置。

### 8.3 FeedStore

推荐与关注分别保存：

- `items`
- `nextCursor`
- `nextOffset`
- `hasMore`
- `loading`
- `refreshing`
- `scrollTop`
- `loadedAt`

退出登录时清空关注流和个性化字段，推荐流内容可以保留并转为匿名状态。

### 8.4 PostDraftStore

```ts
interface PostDraft {
  title: string;
  content: string;
  media: UploadedMedia[];
  shopVisit: boolean;
  section: SectionSummary | null;
  shop: ShopSummary | null;
  submitting: boolean;
  updatedAt: number;
}
```

- 草稿只保存非敏感表单和临时媒体 ID。
- 关闭探店开关时立即清空已选分区和商户。
- 已发布成功后清空草稿。
- 会话失效不自动删除草稿。
- 放弃草稿时请求清理仍处于临时状态的媒体。

## 9. 首页完整契约

### 9.1 页面状态

```ts
type HomeFeedMode = "RECOMMENDED" | "FOLLOWING";

interface HomePageState {
  mode: HomeFeedMode;
  sections: SectionSummary[];
  recommended: FeedState;
  following: FeedState;
  sectionLoading: boolean;
}
```

### 9.2 加载流程

1. 读取城市和当前登录状态。
2. 并行请求官方分区和推荐首屏。
3. 登录用户首次切换“关注”时加载关注流。
4. 页面返回时恢复对应模式的滚动位置。
5. 数据仍在有效缓存时间内时不重复请求；用户下拉刷新时强制重载。

### 9.3 动态卡片

固定顺序：

```text
作者、头像、时间、关注操作
标题（存在时）
正文摘要
图片宫格
左侧分区标签 / 右侧评论数和点赞数
热门评论摘要（存在时）
```

- 点击作者进入用户主页。
- 点击正文或图片进入动态详情。
- 点击分区标签进入分区详情。
- 点击评论计数进入详情并聚焦回复框。
- 点击热门评论进入详情并携带 `focusCommentId`。
- 首页不展示完整商户卡片，不额外逐条请求商户。
- 点赞和关注均使用乐观更新；失败时回滚卡片状态和计数。

## 10. 分区页面契约

### 10.1 分区首页

- 展示启用的官方分区、图标、说明、关注状态。
- 已关注分区优先展示，但不改变平台固定排序。
- 匿名用户点击关注时进入登录，成功后恢复关注意图。

### 10.2 分区详情

- 顶部显示分区封面、名称、说明、关注按钮和动态数。
- 支持 `LATEST`、`HOT` 两个列表状态，各自保存游标和滚动位置。
- “漫游日常”随当前城市切换刷新。
- 点击卡片行为与首页一致。

## 11. 统一发布器契约

### 11.1 普通动态

- `shopVisit=false`。
- 页面显示“将发布到漫游日常”。
- 不显示分区和商户选择器。
- 请求体不发送 `sectionId`、`shopId`。

### 11.2 探店动态

- `shopVisit=true`。
- 展示仅包含 `allowShopVisit=true` 的分区选择器。
- 必须选择商户；支持按当前城市和关键词搜索。
- 商户选定后显示摘要，可重新选择或清除。
- 关闭探店开关时清除商户和分区，避免隐藏值提交。

### 11.3 校验与提交

- 标题可选，最多 120 字。
- 正文去除首尾空白后 1～5000 字。
- 最多 9 张图片且不能重复。
- 存在上传中或上传失败图片时禁止提交。
- 提交时只发送媒体资产字符串 ID。
- 点击提交后禁用表单和重复点击。
- 成功后清空草稿、关闭离开提醒、返回首页并刷新推荐首屏。
- 400 时保留草稿并定位错误字段。

## 12. 图片与临时媒体

- 使用 `wx.chooseMedia`，首期只选择图片。
- 客户端预校验 JPEG、PNG、WebP 和单张 10MB；服务端继续做最终校验。
- 上传状态：`WAITING / UPLOADING / DONE / FAILED`。
- 允许单张重试、删除和调整顺序。
- 上传返回 `mediaId` 和相对 URL，不再用逗号拼接图片路径。
- 离开发布页时：保存草稿则保留临时媒体；放弃草稿则逐个清理。
- 删除失败不阻塞离开，记录待清理媒体 ID并在下次启动重试。
- 图片统一懒加载，列表使用合适尺寸，预览使用原图地址。

## 13. 动态详情与 Threads 式评论

### 13.1 详情布局

```text
作者与发布时间
完整正文
图片
商户连接（仅探店）
点赞和评论操作
热门/最新评论切换
根评论列表与追加回复
底部固定回复框
```

商户连接显示封面、名称、分类、地址、距离、评分和进入商户详情的操作。普通动态不渲染空白占位。

### 13.2 评论状态

热门和最新分别维护根评论列表、游标、加载状态和滚动位置。每个根评论维护预览回复、下一页回复游标和展开状态。

接口消费边界：

- `GET /v1/posts/{postId}/comments` 返回 `CursorPageResult<CommentThread>`。
- `GET /v1/comments/{commentId}/replies` 返回按时间升序的 `CursorPageResult<PostComment>`。
- 根评论和回复分别使用 `POST /v1/posts/{postId}/comments`、`POST /v1/comments/{commentId}/replies`，请求体均只有去除首尾空白后的 `content`。
- 评论删除与点赞分别使用 `/v1/comments/{commentId}` 和 `/v1/comments/{commentId}/like`，所有业务 ID 保持字符串。
- 评论读取使用可选鉴权；发布、回复、删除和点赞必须登录。

### 13.3 回复规则

- 点击根评论回复：目标为根评论作者。
- 点击任意回复：目标为该回复作者，视觉仍保持一级缩进。
- 回复框明确显示当前回复对象并允许取消。
- 发布根评论成功后插入当前排序合适位置；发布回复成功后追加到对应根评论串。
- 更新本地动态评论数和根评论回复数，不重新请求整页。
- 作者回复展示“作者”标识。
- 第一阶段评论只支持文字，正文 1～1000 字。

### 13.4 评论定位

- 首页进入详情时传递 `focusCommentId`。
- 若目标在根评论首屏，渲染完成后滚动定位并短暂高亮。
- 若目标是回复，先加载所属根评论，再加载包含目标的回复页。
- 若评论已删除、隐藏或不存在，提示“该评论暂不可查看”并停留在评论区。
- 客户端不得无限翻页盲找；后端无法提供定位信息时限制最大查找页数并提供手动浏览入口。
- 当前实现最多检查 3 页根评论和各根评论预览回复；未命中时提示用户手动浏览，不继续产生无界请求。

### 13.5 删除和点赞

- 删除有回复的根评论后保留“该评论已删除”占位和回复。
- 删除无回复评论后从当前列表移除。
- 评论点赞采用乐观更新，重复点击期间锁定该评论操作。
- 失败时只回滚对应评论，不刷新整个列表。
- 匿名用户提交评论前保存 10 分钟的非敏感输入和回复目标，登录成功后恢复；发送成功后立即清空。

### 13.6 当前后端联调边界

- `GET /v1/posts/{postId}` 已实现，动态正文、媒体、分区、点赞状态和探店商户摘要可以按正式结构消费。
- 后端商户摘要当前提供 `typeId`、封面、地址和放大 10 倍的评分；尚不提供分类名称和距离，客户端统一换算评分并隐藏缺失字段，不伪造展示值。
- 评论表、评论 Controller、热门排序和定位接口尚未实现。客户端保留真实错误与重试，评论写入不会回退到旧 `tb_blog_comments` 或本地假数据。

## 14. 附近与商户契约

### 14.1 附近页

- 必须具有当前 `cityCode`。
- 支持关键词、商户分类和 `DISTANCE / SCORE / POPULAR` 排序。
- 经纬度必须成对提交。
- 定位拒绝、超时或失败时省略坐标并切换到非距离排序。
- 筛选条件变化时清空旧列表、重置页码并取消迟到请求。

### 14.2 商户详情

展示顺序：

```text
商户图片、名称、评分、地址、距离和营业状态
团购商品
点评摘要与进入全部点评
相关探店动态
营业时间和详细地址
```

- 商户下架或不存在展示资源状态，不保留无效下单入口。
- 点评和动态列表按需加载，首屏避免一次加载全部模块。
- 从动态商户连接进入时保留返回位置。

### 14.3 当前实现与后端联调边界

- 附近页和商户筛选页已经接入城市、分类、关键词、排序、页码和成对坐标参数；关键词输入使用 350ms 防抖，请求序号会丢弃筛选变化前的迟到响应，分页按字符串商户 ID 去重。
- 定位成功后才允许距离排序；拒绝授权、超时、失败、非法坐标或只存在单个坐标时清除精确位置并回退非距离排序。用户切换城市后旧坐标立即失效，旧城市定位结果晚到时不会写回。
- 商户详情先加载主体；优惠和相关探店动态仅在对应区域进入可视范围后请求。每个模块维护独立加载、空数据、错误和重试状态，不因一个聚合模块失败清空商户主体。
- 当前后端 `/v1/shops` 仍只实现 `typeId/name/page/size/longitude/latitude`：客户端额外发送目标契约的 `cityCode/keyword/sort`，并临时同时发送 `name` 保证现有关键词查询可用。城市过滤以及 `SCORE/POPULAR` 服务端排序尚未实现，客户端不使用单页本地排序伪装全量结果。
- 当前后端仅在“指定分类且无关键词并提供坐标”时执行 Redis GEO 距离查询；其他查询可能不返回 `distance`，客户端显示“距离待定位”而不伪造距离。
- 当前优惠仍读取已实现的 `/v1/shops/{shopId}/vouchers`；目标团购商品接口在阶段 9 切换。`/v1/shops/{shopId}/posts` 尚未实现，按需请求失败时展示真实错误和重试；独立点评列表及写入留到阶段 8。

## 15. 商户点评契约

- 列表支持最新和高分排序。
- 点评卡片显示用户、评分、正文、图片、时间和已消费标识。
- 当前用户没有点评时显示发布入口；已有点评时显示编辑入口。
- 发布内容：1～5 分、1～2000 字、最多 9 张图片。
- 客户端不包含 `verifiedConsumption` 字段。
- 创建返回 `REVIEW_ALREADY_EXISTS` 时获取或使用现有点评进入编辑。
- 编辑成功后刷新点评卡片、商户评分和点评数量。
- 删除后重新拉取商户聚合摘要。

## 16. 团购、订单和券包契约

### 16.1 团购商品

- 商户详情只展示可售商品。
- 商品详情展示价格、原价、抵扣值、库存、销量、限购、销售期、有效期和使用规则。
- 下单前客户端二次确认，但价格和库存以服务端结果为准。

### 16.2 订单

- 第一阶段数量固定为 1。
- 防止重复点击创建多张订单。
- 订单列表支持全部、待支付、已支付、已取消和退款状态筛选。
- 仅待支付订单显示取消操作。
- 服务端返回状态冲突时刷新订单详情。
- 第一阶段不展示虚假的微信支付成功流程。

### 16.3 用户券包

- 支持未使用、已使用、已过期和已退款筛选。
- 券详情展示券码、商户、有效期和使用规则。
- 第一阶段不提供扫码核销操作。
- 券码属于敏感业务资产，页面日志和埋点不得记录完整券码。

## 17. 公共组件契约

| 组件                   | 职责                   | 主要事件                                              |
| ---------------------- | ---------------------- | ----------------------------------------------------- |
| `post-card`            | 首页/分区/用户动态卡片 | `openpost/openauthor/opensection/like/comment/follow` |
| `post-media-grid`      | 1～9 张图片布局和预览  | `preview`                                             |
| `draft-media-grid`     | 发布图片状态和排序     | `add/retry/remove/move`                               |
| `section-chip`         | 单个分区标签           | `select/follow`                                       |
| `section-scroll`       | 横向分区入口           | `select`                                              |
| `highlight-comment`    | 首页热门评论摘要       | `open`                                                |
| `comment-thread`       | 根评论及回复串         | `reply/like/delete/loadreplies`                       |
| `comment-item`         | 单条评论展示           | `reply/like/delete`                                   |
| `reply-composer`       | 底部固定回复输入       | `submit/cancelreply`                                  |
| `shop-link-card`       | 动态详情商户连接       | `open`                                                |
| `voucher-product-card` | 团购商品摘要           | `open/order`                                          |
| `page-skeleton`        | 首屏骨架               | 无                                                    |
| `app-empty`            | 空数据状态             | 可选 `action`                                         |
| `app-error`            | 错误和重试             | `retry`                                               |
| `login-required`       | 私有内容登录引导       | `login`                                               |

组件不得发起业务请求，乐观更新由页面或 Service 编排。

## 18. 性能、可用性与隐私

- 列表图片使用懒加载和合适尺寸，避免首页加载原图。
- 首页接口必须直接返回作者、分区、媒体和热门评论摘要，禁止逐卡 N+1 请求。
- 推荐/关注切换不销毁另一列表状态。
- 骨架只用于首次加载；加载更多使用底部状态，不清空已有内容。
- 所有空列表、断网、超时、定位拒绝和资源不存在都有明确状态。
- 可点击图标提供可访问名称，点击区域不小于微信推荐尺寸。
- 日志不得记录 Token、验证码、完整手机号、精确坐标、券码或图片二进制。
- 精确坐标只在当前查询使用，不进行无必要持久化。

## 19. 开发、导入与环境

首次导入：

1. 在小程序目录执行 `npm install`。
2. 检查未提交的 `project.private.config.json` 中的 AppID。
3. 微信开发者工具导入 `D:\JavaPro\roamly\Roamly-miniapp`。
4. 执行 `npm run build:npm` 生成运行依赖。
5. 使用 Stable 基础库、WebView 渲染模式。

本地与真机：

- 开发者工具可使用 `http://127.0.0.1:8081`。
- 真机必须使用电脑局域网地址，不能使用 `127.0.0.1`。
- Spring Boot 必须监听非回环网卡，Windows 防火墙仅向本地子网开放 8081。
- 体验版和正式版必须使用已备案 HTTPS 域名，并分别配置 request、uploadFile 和 downloadFile 合法域名。
- 体验版不得依赖开发者工具的“不校验合法域名”。

## 20. 分阶段实施计划

| 阶段 | 小程序工作                                   | 完成条件                           | 状态   |
| ---: | -------------------------------------------- | ---------------------------------- | ------ |
|    0 | 完成本契约并与后端总契约对齐                 | 路由、接口、类型和状态一致         | 已实现 |
|    1 | 建立 City、Section、Media、Post 新类型和 API | 类型检查及 API 单测通过            | 已实现 |
|    2 | 调整五入口 TabBar，建立分区和附近页骨架      | 导航、登录回跳和分包验证通过       | 已实现 |
|    3 | 实现首页推荐/关注双状态和 Post 卡片          | 游标、滚动恢复、去重和乐观更新通过 | 已实现 |
|    4 | 实现统一发布器和临时媒体                     | 草稿、探店开关、上传和清理通过     | 已实现 |
|    5 | 实现分区列表和分区详情                       | 最新/热门、关注和城市切换通过      | 已实现 |
|    6 | 实现动态详情、商户连接和 Threads 评论        | 回复追加、定位、删除和点赞通过     | 已实现 |
|    7 | 重构附近和商户详情聚合                       | 定位降级、筛选和按需加载通过       | 已实现 |
|    8 | 实现点评发布、编辑和列表                     | 唯一点评、图片和评分刷新通过       | 未实现 |
|    9 | 实现团购详情、订单和券包                     | 状态展示、取消和资产权限通过       | 未实现 |
|   10 | 删除 Blog 兼容类型、页面和旧 API             | 后端切换、全量回归和无旧引用       | 未实现 |
|   11 | 搜索、通知、举报、支付和核销                 | 另行设计评审                       | 未实现 |

## 21. 测试与验收

### 21.1 自动测试

执行：

```text
npm run build:npm
npm run verify
```

自动测试至少覆盖：

- API Base URL 与资源 Base URL 不重复 `/api`。
- Bearer Header、匿名可选鉴权和 401 清理。
- 登录后恢复原页面和交互意图。
- 所有业务 ID 保持字符串。
- 推荐/关注游标、列表去重和滚动状态互不污染。
- 点赞、关注、评论乐观更新失败回滚。
- 探店开关的条件字段与隐藏值清理。
- 临时媒体上传、重试、删除和草稿保留。
- 热门评论跳转参数与评论定位。
- 定位成功、拒绝、超时和非法参数降级。
- 订单状态和用户券状态映射。

### 21.2 开发者工具与真机

- 清除缓存后重新编译，验证主包和所有分包路由。
- Android、iOS 各验证一次推荐、关注、分区、发布、详情评论、附近、点评、订单和券包。
- 验证无登录、Token 失效、弱网、断网、图片失败和定位拒绝。
- 检查长文本、9 图、无图、无热门评论、删除评论占位和深层回复布局。
- 检查首页返回后的滚动位置和发布成功后的首屏刷新。

### 21.3 验证记录

| 日期       | 阶段                                          | 结果                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-02 | 阶段 1：City、Section、Media、Post 类型和 API | `npm run verify` 通过：9 个测试文件、29 项测试；覆盖新接口路径、鉴权模式、可选游标清理、普通动态隐藏字段、媒体上传和字符串大 ID。后端目标接口尚未实现，因此未进行真实联调。                                                                                                                                                                                                                                                                                                         |
| 2026-09-02 | 阶段 2：五入口导航与页面骨架                  | `npm run verify` 通过：10 个测试文件、32 项测试；覆盖四个 Tab 页面、中央发布入口、匿名进入“附近/我的”、新页面文件和登录回跳。分区与附近目标接口尚未实现，页面暂为可导航骨架。                                                                                                                                                                                                                                                                                                       |
| 2026-09-02 | 阶段 3：首页双信息流与 Post 卡片              | `npm run verify` 通过：13 个测试文件、43 项测试；`npm run build:npm` 成功生成 2 个依赖。覆盖推荐/关注状态隔离、空列表缓存、游标与偏移、字符串 ID 去重、滚动恢复、登录门禁、点赞/关注乐观回滚、热门评论定位参数和目标详情占位路由。后端推荐流与 Post 接口仍未实现，真实联调顺延。                                                                                                                                                                                                    |
| 2026-09-02 | 阶段 4：统一发布器与临时媒体                  | `npm run verify` 通过：18 个测试文件、60 项测试；`npm run build:npm` 成功生成 2 个依赖。覆盖普通动态隐藏字段、探店分区/商户约束、字符串媒体 ID、草稿持久化、上传中断恢复、图片去重与排序、失败重试、放弃清理队列、服务端字段错误定位和发布入口迁移。后端 Post 创建与媒体绑定源码和 OpenAPI 已实现；运行数据库未重建，真实发布联调顺延。                                                                                                                                             |
| 2026-09-02 | 阶段 5：分区列表与详情                        | `npm run verify` 通过：21 个测试文件、73 项测试；`npm run build:npm` 成功生成 2 个依赖。分区列表和详情已实现加载、刷新、错误/空状态、最新/热门按城市隔离游标和滚动位置、字符串 ID 去重、关注回滚、登录后意图恢复及“漫游日常”城市切换；首页推荐流会在返回时同步切换城市。后端分区列表和详情已实现，但列表尚不返回说明、详情尚不返回动态数和关注数，因此客户端使用通用说明并隐藏缺失统计；`/v1/sections/{sectionId}/posts` 尚未实现，页面保留真实错误和重试状态，真实信息流联调顺延。 |
| 2026-09-02 | 阶段 6：动态详情与 Threads 评论               | `npm run verify` 通过：26 个测试文件、90 项测试；`npm run build:npm` 成功生成 2 个依赖。完成 Post 详情响应适配、探店商户连接、动态点赞和作者关注、热门/最新评论状态隔离、一级缩进回复串、回复分页、底部输入框、登录后输入恢复、评论点赞回滚、删除占位及最多 3 页的评论定位。后端 Post 详情已实现，但评论接口、评论表和评论定位尚未实现，评论区会展示真实错误和重试；商户摘要缺少分类名称和距离时隐藏相应字段。                                                                      |
| 2026-09-02 | 阶段 7：附近与商户详情聚合                    | `npm run verify` 通过：29 个测试文件、104 项测试；`npm run build:npm` 成功生成 2 个依赖。完成城市与分类筛选、关键词防抖、筛选请求隔离、字符串 ID 分页去重、定位成功/拒绝/失败降级、切换城市清除旧坐标、商户展示模型适配，以及商户主体、优惠、点评摘要和相关动态的分模块状态与可视区按需加载。后端城市过滤、评分/热门排序、商户相关动态和独立点评尚未实现；客户端保留 `name` 兼容参数并展示真实缺失状态，不做本地假排序或假数据兜底。                                                |

## 22. 明确非目标与风险

- 第一阶段评论只支持文字，不支持评论图片、GIF或视频。
- 用户不能创建公共分区。
- 不引入新的状态管理框架，不迁移 Skyline。
- 不实现真实支付、退款、扫码核销、商户后台和管理角色。
- 当前本地资源路径仍为 `/blogs/**`；迁移对象存储时必须保持媒体 URL 解析层稳定。
- 本次设计不保留长期 `/v1/blogs` 客户端兼容；正式切换时小程序与后端同步升级。
