# 开发计划

> 配套阅读:[REQUIREMENTS.md](REQUIREMENTS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [UI_DESIGN.md](UI_DESIGN.md) · [DESIGN.md](DESIGN.md)  
> 版本:v1.2 · 2026-05-23(M2 完成,准备进 M3)

---

## 总览

按 8 个里程碑推进。每个里程碑都有**明确产出**和**验收点**,完成验收才进下一阶段。

| 阶段 | 名称 | 状态 | Commit | 核心产出 |
|---|---|---|---|---|
| M0 | 工程脚手架 | ✅ 完成 | `93f1ac5` | 前后端可启动空壳 + DB 通 |
| M1 | 用户体系 | ✅ 完成 | `a216bf9` | 注册/登录/JWT/角色守卫 |
| M2 | 文章 CRUD | ✅ 完成 | `ec9ae9a` + (this) | 写、改、删、看文章 |
| **M3** | **列表 / 搜索 / 分类标签** | ⏳ **下一步** | — | 首页可用 |
| M4 | 评论与互动 | ⏳ 待开始 | — | 评论 + 点赞 + 收藏 |
| M5 | 文件上传 | ⏳ 待开始 | — | 封面图、正文图 |
| M6 | 管理后台 | ⏳ 待开始 | — | `/admin` 全套 |
| M7 | 部署准备 | ⏳ 待开始 | — | Dockerfile + env 分层 |

**总计预估**:约 7 天工作量(单人,全职)。  
**实际进度**:M0 / M1 / M2 完成,准备进 M3。

---

## M0 · 工程脚手架 ✅

**目标**:跑通 `pnpm dev` 同时启动前后端,后端能连到本地 MySQL,前端打开是一个 hello 页。

### 任务清单
- [x] 初始化根目录 `package.json`、`pnpm-workspace.yaml`
- [x] `client/`:Vite + React 18 + TS + Tailwind + React Router + TanStack Query + axios + Zustand + lucide-react + RHF + Zod
- [x] `server/`:Express + ts + tsx + zod + prisma + bcrypt + jsonwebtoken + multer + pino + helmet + cors + dotenv-cli
- [x] 根目录 `tsconfig.base.json`,`client/server` 各自继承
- [x] `.env.example` 模板;`.gitignore` 覆盖 `node_modules`、`.env`、`dist`、`uploads`
- [x] `server/prisma/schema.prisma` 写入完整 schema(8 张表)
- [x] **MySQL 用 docker-compose 起**(`pnpm db:up`)+ `scripts/mysql-init.sql` 自动授权
- [x] `prisma migrate dev --name init` 跑通
- [x] `server`:`GET /api/health` 返回 `{ok: true}`
- [x] `client`:首页 fetch `/api/health` 并显示
- [x] 根目录 `pnpm dev` 用 `concurrently` 同时拉前后端
- [x] `git init` + 首次提交
- [ ] ~~ESLint + Prettier + Husky + lint-staged~~(本期仅用 `tsc --noEmit` 兜底,待 M7 前补)

### 实际验收
- ✅ 浏览器打开 `localhost:5173` 看到 hello + health ok
- ✅ Vite proxy `/api` 正常代理到 server:4000
- ✅ `pnpm typecheck` 双包零错误

---

## M1 · 用户体系 ✅

**目标**:用户能注册、登录、拿到 JWT,前端能识别登录态,角色守卫工作。

### 后端
- [x] `utils/password.ts`:bcrypt 包装(salt 10)
- [x] `utils/jwt.ts`:sign / verify(HS256, 7d)
- [x] `utils/errors.ts`:`HttpError` 体系(BadRequest / Unauthorized / Forbidden / NotFound / Conflict)
- [x] `middlewares/auth.ts`:解 token → `req.user`(可选)
- [x] `middlewares/requireAuth.ts`:必须登录
- [x] `middlewares/requireRole.ts`:角色检查
- [x] `middlewares/validate.ts`:Zod schema → 校验
- [x] `middlewares/error.ts`:全局错误拦截 + 统一 `{error: {code, message, details?}}` 格式
- [x] `services/auth.service.ts`:register / login / me
- [x] `controllers/auth.controller.ts`
- [x] `routes/auth.routes.ts`
- [x] 注入到 `app.ts`
- [x] 写 seed:admin/admin123 + 4 个分类(前端/后端/工具/思考)

### 前端
- [x] `api/http.ts`:axios 拦截器(塞 token、401 自动登出跳 `/login`)
- [x] `api/auth.ts`:register / login / me
- [x] `stores/auth.store.ts`:Zustand 管理 user + token,**仅 token 持久化**,user 每次 boot 通过 `/me` 重新拉
- [x] `hooks/useAuthBoot.ts`:App 启动时 fetch /me,守卫前等数据齐
- [x] `pages/Login.tsx` + `pages/Register.tsx`:RHF + Zod + Aurora 蓝光斑背景
- [x] `components/RequireAuth.tsx`:路由守卫(支持 `role` 参数)
- [x] `layouts/PublicLayout.tsx`:顶部导航根据登录态切换显示 + 头像下拉(个人中心 / 管理后台 / 退出)
- [x] `router.tsx`:嵌套路由 + 守卫嵌套

### 实际验收
- ✅ E2E 验证 8/8:register(201) / dup→409 / login → user+token / wrong→401 / /me带token→200 / /me无→401 / Zod校验→400+中文 details / admin 角色能进 `/admin` 普通账号不能
- ✅ 登录后 localStorage 持久化 token,刷新页面仍是登录态

---

## M2 · 文章 CRUD ✅

**目标**:登录用户能创建、编辑、删除自己的文章,所有人能看详情。

### 后端 ✅(commit `ec9ae9a` + by-id route)
- [x] `services/article.service.ts`:
  - [x] `listArticles({page, pageSize, keyword, categoryId, tag, status, authorId})`:支持权限感知的草稿可见性
  - [x] `getArticleBySlug(slug, viewer?)`:草稿仅作者 / 管理员可见;published 自增 viewCount
  - [x] `getArticleById(id)`
  - [x] `createArticle(authorId, data)`:生成 slug、关联 tags(自动 upsert)、保证 categoryId 存在
  - [x] `updateArticle(articleId, viewer, data)`:校验权限,可改 status + 自动设 publishedAt
  - [x] `deleteArticle(articleId, viewer)`:作者 / 管理员
  - [x] `publishArticle(articleId, viewer)`:`draft → published` + 设 `publishedAt`
- [x] `utils/slug.ts`:ASCII 规范化 + nanoid 兜底(中文标题 → `post-xxxxxxxxxx`)
- [x] `utils/nanoid.ts`:轻量自实现,避免 ESM/CJS 互操问题
- [x] `utils/pagination.ts`:统一返回 `{items, total, page, pageSize, pageCount}`
- [x] `controllers/article.controller.ts`
- [x] `routes/article.routes.ts`:7 个接口
- [x] **新增** `GET /api/articles/by-id/:id`:auth-only,编辑模式用
- [x] `routes/category.routes.ts`:GET 列表(含 article 计数)
- [x] `routes/tag.routes.ts`:GET 列表(含 article 计数)
- [x] Zod schema 校验:title 1–100、content 必填、categoryId 必须存在、tags 最多 6 等
- [x] `scripts/test-m2-server.sh`:**18 项 e2e 断言全部通过**
- [x] `server/prisma/seed-articles.ts`:5 篇真实示例文章 + 1 篇草稿,幂等可重复运行

### 前端 ✅
- [x] `api/articles.ts`:list / getBySlug / getById / create / update / delete / publish
- [x] `api/taxonomy.ts`:listCategories / listTags
- [x] `types/api.ts`:Article / Category / Tag / PagedResult 等完整类型
- [x] `utils/format.ts`:formatDate / estimateReadTime
- [x] `utils/cn.ts`:轻量 classnames
- [x] `components/MarkdownRenderer.tsx`:react-markdown + remark-gfm + rehype-highlight + rehype-sanitize(白名单 className 让高亮幸存)
- [x] `components/StatusBadge.tsx`:PUBLISHED / DRAFT 状态徽章
- [x] `components/EmptyState.tsx`:统一空态组件
- [x] `pages/Write.tsx`:
  - [x] 集成 `@uiw/react-md-editor`(双栏 + 预览可收起)
  - [x] 表单:标题 / 摘要 / 分类下拉 / 标签输入(回车 + 逗号添加,Backspace 删除)/ 封面图 URL
  - [x] 底部 sticky 行动条:保存草稿 / 发布(已发布时为 "保存修改" + "更新发布")
  - [x] 自动估算阅读时长(中文 + 英文混排)
  - [x] 删除按钮(仅编辑模式)
- [x] `pages/ArticleDetail.tsx`:Markdown 渲染 + 代码高亮 + sanitize + TOC(从正文 ## ### 抓)+ 作者卡 + 编辑入口(作者/admin 可见)
- [x] `pages/Me.tsx`:tabs(我的文章 / 草稿 / 我的收藏 M4 占位 / 资料)+ 紧凑型文章行
- [x] `pages/Home.tsx`:zigzag 列表(参考 mockup,左右图片交替)+ Klein hero
- [x] `router.tsx`:`/write` / `/write/:id` / `/articles/:slug` 路由
- [x] `index.css`:`.prose-article` 完整 Markdown 样式 + highlight.js + md-editor CSS

### 实际验收
- ✅ 草稿创建后:`/me` 草稿 tab 可见、详情页他人 404、作者自己 200
- ✅ 发布后他人能在详情页看到、首页能看到
- ✅ 编辑后保存,内容更新(标签 diff、status 切换都对)
- ✅ 删除后详情页 404
- ✅ 浏览量自增正常
- ✅ Vite proxy + JWT 头自动注入跑通
- ✅ Typecheck 零错误

### M2 关键设计决策
1. **Write page 不用 RHF** — MDEditor 对受控 props 比较挑剔,简单 useState 反而清爽
2. **publish 是两步原子操作** — 先 update 拿最新字段,再 flip status,避免"我改了但发布的是旧版"
3. **TOC 是正则扫 `^## / ^###` 出来的**,不用额外的 markdown AST 库;锚点哈希用同样的 slugify 规则
4. **rehype 顺序**:`highlight` → `sanitize`,sanitize schema 白名单 `code.className` / `span.className`,否则高亮 token 全被剥
5. **草稿可见性 — by-id 路由必须放 `/:slug` 前面**,否则 "by-id" 会被当 slug 处理

---

## M3 · 列表 / 搜索 / 分类标签

**目标**:首页可用,能浏览、分页、按标题搜、按分类/标签筛选。

### 后端
- [x] ~~`services/article.service.ts` 加 `listArticles({...})`~~ 已在 M2 完成
- [x] ~~分页工具 `utils/pagination.ts`~~ 已在 M2 完成
- [x] ~~`category.routes.ts` / `tag.routes.ts` 只读路由~~ 已在 M2 完成
- [ ] (按需)分类管理员可写接口 — 推迟到 M6 admin 模块统一做

### 前端
- [ ] `pages/Home.tsx`:文章 zigzag 列表(参考 mockup `01-home.html`) + 分页器
- [ ] `pages/Home.tsx`:Hero 区(居中 + Aurora blob + 头像 inline-in-headline)
- [ ] `components/ArticleRow.tsx`:zigzag 行(左图右文 / 右图左文 交替)
- [ ] `pages/CategoryArchive.tsx` `/categories/:slug`
- [ ] `pages/TagArchive.tsx` `/tags/:name`
- [ ] 搜索框:在顶导搜索 icon 上做弹层,防抖 300ms,改 URL query

### 验收
- 首页能看到列表(M2 的脏数据 + M3 自己 seed 几篇)
- 搜索关键词能筛出文章
- 点分类/标签能进归档页

---

## M4 · 评论与互动

**目标**:登录用户能评论、点赞、收藏。

### 后端
- [ ] `services/comment.service.ts`:list / create / delete(权限:评论者 / 文章作者 / 管理员)
- [ ] `routes/comment.routes.ts` 挂在 `/api/articles/:articleId/comments`
- [ ] `services/interaction.service.ts`:`toggleLike` / `toggleFavorite`
- [ ] 详情页接口返回 `likeCount` / `favoriteCount` / `liked` / `favorited`(后两者需登录态)
- [ ] `/api/users/me/favorites` 列表

### 前端
- [ ] `components/CommentList.tsx` + `CommentForm.tsx`(参考 mockup `02-article-detail.html`)
- [ ] 详情页右栏 reactions 卡片:点赞/收藏/分享按钮(图标 + 计数)
- [ ] `pages/Me.tsx` 加"我的收藏"tab

### 验收
- 未登录看到评论列表但不能发(composer 引导跳登录)
- 登录后能发、能删自己的;文章作者能删自己文章下任何评论
- 点赞/收藏 toggle 正常
- "我的收藏"显示收藏过的文章

---

## M5 · 文件上传

**目标**:写文章时能传封面图,Markdown 编辑器内能粘贴/拖入图片自动上传。

### 后端
- [ ] `middlewares/upload.ts`:multer 配置(磁盘 + 类型 + 大小 ≤ 5MB)
- [ ] `routes/upload.routes.ts`:`POST /api/upload/image` 必须登录
- [x] ~~`app.ts`:`app.use('/uploads', express.static(...))`~~ 已在 M0 完成
- [ ] 文件命名:`uploads/yyyymm/<nanoid>.<ext>`

### 前端
- [ ] `api/upload.ts`:`FormData` 上传
- [ ] `pages/Write.tsx`:
  - [ ] 封面图区域:拖拽 / 点选,上传完显示预览(参考 mockup `03-write.html` 的 dropzone)
  - [ ] Markdown 编辑器集成:粘贴/拖入图片自动上传,插入 `![](url)`

### 验收
- 上传 png/jpg/webp ≤ 5MB 成功,返回 URL
- 上传 PDF 报错 400
- 上传 6MB 文件报错 413(或 400)
- 预览图能看到

---

## M6 · 管理后台

**目标**:`/admin` 全套(独立路由),管理员能管理一切。

### 后端
- [ ] `services/admin.service.ts`:
  - [ ] `stats()`:文章数、用户数、评论数、近 7 日发文趋势
  - [ ] `listUsers({page, keyword})`
  - [ ] `updateUser(id, {role?, isActive?})`
  - [ ] `listComments({page, keyword})`
- [ ] 分类增删改:`POST/PUT/DELETE /api/categories`(此前 M2 只做了 GET)
- [ ] 标签删除:`DELETE /api/tags/:id`
- [ ] `routes/admin.routes.ts`:全套挂 `requireRole('ADMIN')`

### 前端
- [ ] `layouts/AdminLayout.tsx`:侧边栏 + 顶部 + 内容区(参考 mockup `06-admin-dashboard.html`)
- [ ] `pages/admin/Dashboard.tsx`:Bento stat 卡片 + 趋势图(SVG path 手绘 或 recharts)
- [ ] `pages/admin/Articles.tsx`:全平台文章表格 + 批量操作 + 筛选(参考 mockup `07-admin-articles.html`)
- [ ] `pages/admin/Categories.tsx`:CRUD 表格
- [ ] `pages/admin/Tags.tsx`:列表 + 删除
- [ ] `pages/admin/Users.tsx`:列表 + 改角色 / 禁用切换
- [ ] `pages/admin/Comments.tsx`:全平台评论 + 删除

### 验收
- admin 账号能看到全部页面,数据正确
- 普通用户访问 `/admin` 被拦截到 `/`

---

## M7 · 部署准备

**目标**:能用 `docker compose up` 在干净的机器上拉起整个系统。

### 任务清单
- [x] ~~`docker-compose.yml`:MySQL~~ 已在 M0 完成,生产版需扩展
- [ ] `Dockerfile.server`:多阶段(builder → runner),copy prisma migrations
- [ ] `Dockerfile.client`:Vite build → nginx alpine
- [ ] `nginx.conf`:反向代理 `/api` 到 server:4000,静态文件由 nginx 直出,`/uploads` 也走 nginx
- [ ] `docker-compose.yml` 生产版:nginx + server + mysql,volumes(uploads + mysql data)
- [ ] `.env.production.example`
- [ ] 启动脚本:容器内自动跑 `prisma migrate deploy`
- [ ] `README.md`:开发启动 + 生产部署两套说明(开发部分已就绪)
- [ ] (按需)ESLint + Prettier + Husky:补全工程质量底座

### 验收
- `cp .env.production.example .env.production` 填好密钥
- `docker compose -f docker-compose.prod.yml up -d --build` 一次拉起
- 浏览器访问 `localhost` 看到首页

---

## 验收准则(适用于所有阶段)

每个里程碑结束前自查:

1. ✅ TypeScript 编译无错(`tsc --noEmit`)
2. ⏸ ~~`pnpm lint` 不报错~~(M0 决定推迟 ESLint 到 M7,期间仅以 tsc 兜底)
3. ✅ 手动测试覆盖里程碑列出的"验收"项(M2-server 已用 e2e 脚本固化)
4. ✅ 关键改动有 commit,信息符合 `feat/fix/refactor/chore(milestone)` 规范
5. 📝 测试代码:能写脚本固化最好(M2 server 已固化 18 项断言);UI 端 M7 前不上单测

---

## 风险与时间缓冲

| 风险点 | 缓冲策略 | 实际情况 |
|---|---|---|
| Stitch 设计返工 | UI 方向选定后再码代码 | ⚠️ Stitch MCP 不可用,改用 frontend-design 出静态 HTML mockup,效果相同 |
| Prisma schema 改动 | 早期数据可清空重建 | OK,目前未改 schema |
| Markdown 编辑器集成深度 | 优先用默认能力 | 待 M2-client 验证 |
| 上传防刷 / 计数防刷 | 本期最简实现,后期可上 Redis | 暂用 fire-and-forget +1 |
| 中文标题 slug 生成 | 走 nanoid 兜底 | ✅ 已落地,e2e 验证通过 |

---

## 当前位置

- [x] 需求文档 ✅
- [x] 技术架构 ✅
- [x] UI 设计(Aurora AI · Klein Electric) ✅
- [x] 7 张 HTML mockup ✅
- [x] M0 工程脚手架 ✅
- [x] M1 用户体系 ✅
- [x] M2 文章 CRUD ✅(server + client + 5 篇种子文章 + 1 篇草稿)
- [ ] **M3 列表 / 搜索 / 分类标签 📍 你在这里**
- [ ] M4 评论与互动
- [ ] M5 文件上传
- [ ] M6 管理后台
- [ ] M7 部署准备
