# 技术架构文档

> 配套阅读:[REQUIREMENTS.md](REQUIREMENTS.md)  
> 版本:v1.0 · 2026-05-23

---

## 1. 系统总览

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │  Main Site (SPA) │         │  Admin Console (SPA)     │ │
│  │   /              │         │   /admin                 │ │
│  └────────┬─────────┘         └────────────┬─────────────┘ │
└───────────┼─────────────────────────────────┼───────────────┘
            │                                 │
            │     HTTPS  +  Bearer JWT        │
            ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express API  (Node.js + TS)                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Routes → Controllers → Services → Repos (Prisma)    │    │
│  │  ├─ auth middleware  (JWT verify)                   │    │
│  │  ├─ role middleware  (USER / ADMIN)                 │    │
│  │  ├─ validate middleware (Zod)                       │    │
│  │  ├─ upload middleware (multer)                      │    │
│  │  └─ error middleware  (统一格式)                     │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌──────────────┐       ┌──────────────────────────┐        │
│  │   uploads/   │       │   Prisma Client          │        │
│  │ (静态资源)    │       └────────────┬─────────────┘        │
│  └──────────────┘                    │                      │
└──────────────────────────────────────┼──────────────────────┘
                                       ▼
                            ┌────────────────────┐
                            │     MySQL 8        │
                            └────────────────────┘
```

前端、后端、数据库三层。前端是两个互相独立的 SPA bundle(主站 + 后台),共享同一个 Express API。

---

## 2. 前端架构

### 2.1 路由分组

主站路由与后台路由通过**布局组件**隔离,共享同一份 Vite 项目:

```
<Routes>
  <Route element={<PublicLayout />}>          // 顶部导航 + 页脚
    <Route path="/" element={<Home />} />
    <Route path="/articles/:slug" ... />
    <Route path="/login" ... />
  </Route>

  <Route element={<UserLayout />}>             // 登录用户专属
    <Route path="/me" ... />
    <Route path="/write" ... />
  </Route>

  <Route element={<AdminLayout />}>            // 管理员后台
    <Route path="/admin" ... />
    <Route path="/admin/articles" ... />
    ...
  </Route>
</Routes>
```

`UserLayout` 与 `AdminLayout` 内部用 `<RequireAuth role="USER|ADMIN">` 守卫包裹。

### 2.2 状态管理分层

| 类型 | 工具 | 用途 |
|---|---|---|
| 服务端状态 | **TanStack Query** | 文章列表、详情、评论等远程数据,带缓存/失效 |
| 客户端状态 | **Zustand** | 当前登录用户、主题、UI 偏好(轻量,不引入 Redux) |
| 表单状态 | **React Hook Form + Zod** | 表单受控 + 校验 |

约束:**不要把服务端数据放进 Zustand**,避免双重真相源。

### 2.3 接口封装

```
client/src/api/
├── http.ts          # axios 实例,自动塞 Authorization,401 统一跳登录
├── auth.ts          # login / register / me
├── articles.ts      # CRUD + 互动
├── comments.ts
├── categories.ts
├── tags.ts
├── upload.ts
└── admin.ts
```

每个文件导出一组函数 + 对应的 Query/Mutation Hook。

### 2.4 关键决策

- **Markdown 渲染**:`react-markdown` + `remark-gfm` + `rehype-highlight` + `rehype-sanitize`(开启白名单)
- **代码高亮主题**:`highlight.js` 默认主题,可换
- **图片**:封面图固定比例(16:9),懒加载 `loading="lazy"`
- **SEO**:主站详情页用 `react-helmet-async` 注入 `<title>` / `<meta>`(本期不上 SSR)
- **错误边界**:每个 Layout 顶部一个 ErrorBoundary,fallback 友好提示

---

## 3. 后端架构

### 3.1 分层

```
server/src/
├── routes/         # 只做路由绑定与中间件挂载
├── controllers/    # 请求/响应处理,调用 service
├── services/       # 纯业务逻辑,操作 Prisma,可单测
├── middlewares/    # auth / role / validate / upload / error
├── utils/          # jwt / password / slug / pagination
├── config/         # 环境变量集中读取
├── types/          # express.Request 扩展(user 字段)
└── prisma/         # schema + migrations
```

**规则**:Controller 不直接写 Prisma 查询,统一进 Service。便于复用与测试。

### 3.2 请求生命周期

```
Request
  → cors
  → json body parser (≤ 1MB)
  → router match
  → auth middleware (可选)
  → role middleware (可选)
  → validate middleware (Zod)
  → controller
      → service
          → prisma
  → response
  → error middleware (兜底)
```

### 3.3 错误响应统一格式

```ts
// 成功
{ data: ... }

// 失败
{ error: { code: "VALIDATION_ERROR", message: "...", details?: ... } }
```

HTTP 状态码对齐 RESTful 惯例:`400 / 401 / 403 / 404 / 409 / 422 / 500`。

### 3.4 鉴权流程

```
POST /api/auth/login  { username, password }
  → bcrypt.compare()
  → jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' })
  → return { token, user }

后续请求:
Authorization: Bearer <token>
  → middleware decode → req.user = { id, role }
  → 路由处理
```

JWT 不做服务端黑名单;有"主动登出"需求时,通过减少 token 有效期 + 客户端清除来近似实现。

### 3.5 文件上传流程

```
POST /api/upload/image  (multipart/form-data, field=file)
  → multer 校验:
      - 仅 image/png | jpeg | webp
      - ≤ 5MB
  → 文件落盘:uploads/yyyymm/<uuid>.<ext>
  → 返回:{ url: "/uploads/yyyymm/xxx.png" }

GET /uploads/...
  → express.static('uploads', { maxAge: '7d' })
```

---

## 4. 数据库设计

### 4.1 ER 关系(精简)

```
User ──< Article >── Category
            │
            ├──< ArticleTag >── Tag
            │
            ├──< Comment >── User
            │
            ├──< Like >── User
            │
            └──< Favorite >── User
```

### 4.2 索引策略

| 表 | 索引 | 用途 |
|---|---|---|
| Article | `(status, publishedAt)` | 首页/列表分页 |
| Article | `(authorId)` | 个人中心"我的文章" |
| Article | `slug` UNIQUE | 详情页路由 |
| Article | `(title)` 前缀 / `FULLTEXT` (可选) | 标题搜索 |
| Comment | `(articleId, createdAt)` | 评论分页 |
| User | `username`, `email` UNIQUE | 登录 |

### 4.3 软删除策略

本期**不做软删除**。删除文章 → 评论/点赞/收藏级联清理(Prisma `onDelete: Cascade`)。

### 4.4 浏览量防刷

每次访问详情页 `viewCount += 1`,带轻量防刷:
- 简单方案:`Set<articleId+ip>` 内存缓存,10 分钟内同一 IP 不重复计数
- 进阶方案(可选):Redis 做 TTL key

---

## 5. 安全策略

| 维度 | 措施 |
|---|---|
| 密码 | bcrypt salt rounds=10;返回值永远不含 `passwordHash` |
| JWT | HS256,7 天过期,密钥放 `JWT_SECRET` 环境变量 |
| CORS | 显式白名单 origin,生产/开发两套配置 |
| 输入校验 | 所有 body/query 走 Zod,失败 400 |
| SQL 注入 | Prisma 参数化查询天然防御 |
| XSS | Markdown 渲染走 `rehype-sanitize`,白名单 tag |
| CSRF | JWT 放 Header(非 Cookie),不易受 CSRF 影响 |
| 文件上传 | 类型 + 大小校验,UUID 重命名,不信任原始文件名 |
| 限流 | `express-rate-limit` 保护 `/auth/*`、`/comments`(后续) |
| Helmet | `helmet()` 中间件设置安全 HTTP 头 |
| 日志 | pino 结构化日志,生产环境不打印 password/token |

---

## 6. 性能与可观测

### 6.1 前端

- 路由懒加载:`React.lazy(() => import(...))` 分割主站/后台 bundle
- 图片懒加载 + 固定宽高(避免 CLS)
- TanStack Query 缓存 + `staleTime` 控制重复请求
- 生产构建开 `vite build --mode production`,Tailwind 自动 purge

### 6.2 后端

- 列表接口必须分页(默认 10,最大 50)
- N+1 查询用 Prisma `include` 显式 join
- 静态资源加 `Cache-Control`

### 6.3 可观测(本期最小集)

- 后端:pino 日志输出 stdout
- 前端:浏览器 Console + Sentry(可选,后续)

---

## 7. 部署架构(预留)

### 7.1 开发环境

```
本地:  pnpm dev   (并发起 client:5173 + server:4000)
       MySQL 跑在本地或 docker-compose
```

### 7.2 生产环境(目标)

```
┌───────────────┐
│    Nginx      │ ← HTTPS, 反向代理
└──┬─────────┬──┘
   │         │
   │ /api    │ /  (静态文件)
   ▼         ▼
┌──────┐  ┌───────────────┐
│ Node │  │ Vite build/   │
│  4000│  │ (client dist) │
└──┬───┘  └───────────────┘
   │
   ▼
┌──────┐    ┌──────────────┐
│MySQL │    │ uploads/ vol │
└──────┘    └──────────────┘
```

容器化方案:
- `Dockerfile.server`:多阶段,builder 装依赖 + tsc,runner 跑产物
- `Dockerfile.client`:Vite build 后产物丢进 nginx
- `docker-compose.yml`:nginx + server + mysql + 命名 volume(`uploads/`)
- 环境变量分层:`.env.development` / `.env.production` / `.env.example`(入库)

---

## 8. 工程约定

### 8.1 命名

- 文件:kebab-case(`article-service.ts`)
- 组件:PascalCase(`ArticleCard.tsx`)
- 变量/函数:camelCase
- 类型/接口:PascalCase,导出类型用 `type` 优先于 `interface`

### 8.2 提交规范

`type(scope): subject`,常用 type:`feat`、`fix`、`refactor`、`docs`、`chore`、`test`。

### 8.3 代码风格

- ESLint + Prettier,根目录统一配置
- Husky + lint-staged:commit 前自动 fix
- TS 严格模式(`strict: true`)

### 8.4 测试策略(本期最小集)

| 层 | 工具 | 覆盖 |
|---|---|---|
| 后端 service | Vitest | 关键业务函数(slug 生成、分页参数、权限判定) |
| 后端 API | Vitest + supertest | 鉴权失败、列表/创建主流程 |
| 前端 | 暂不做单测 | M7 之后视情况补 |

---

## 9. 开发环境要求

| 工具 | 版本 |
|---|---|
| Node.js | 20 LTS |
| pnpm | 9.x |
| MySQL | 8.x |
| Git | 任意 |

---

## 10. 风险点与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| MySQL 中文全文索引差 | 标题搜索效果一般 | 当前用 `LIKE`,后期升级 Meilisearch |
| 本地上传无 CDN | 大流量下首屏慢 | 部署时可换 OSS,接口契约不变 |
| JWT 无法主动失效 | 退出登录不彻底 | token 短期 + 客户端清理;高敏感场景再上 Redis 黑名单 |
| Prisma 迁移冲突 | 多人改 schema | 单人开发暂无,后续约定串行化 |
