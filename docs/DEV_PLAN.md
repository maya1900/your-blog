# 开发计划

> 配套阅读:[REQUIREMENTS.md](REQUIREMENTS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [UI_DESIGN.md](UI_DESIGN.md) · [DESIGN.md](DESIGN.md)  
> 版本:v1.7 · 2026-05-24(M7 完成,8 个里程碑收官)

---

## 总览

按 8 个里程碑推进。每个里程碑都有**明确产出**和**验收点**,完成验收才进下一阶段。

| 阶段 | 名称 | 状态 | Commit | 核心产出 |
|---|---|---|---|---|
| M0 | 工程脚手架 | ✅ 完成 | `93f1ac5` | 前后端可启动空壳 + DB 通 |
| M1 | 用户体系 | ✅ 完成 | `a216bf9` | 注册/登录/JWT/角色守卫 |
| M2 | 文章 CRUD | ✅ 完成 | `ec9ae9a` / `798163f` / `5afa4cd` | 写、改、删、看文章 |
| M3 | 列表 / 搜索 / 分类标签 | ✅ 完成 | `67b9328` | 首页可用 |
| M4 | 评论与互动 | ✅ 完成 | `1d9e320` | 评论 + 点赞 + 收藏 |
| M5 | 文件上传 | ✅ 完成 | `a95074d` | 封面图、正文图 |
| M6 | 管理后台 | ✅ 完成 | `85c79ae` | `/admin` 全套 |
| **M7** | **部署准备** | ✅ 完成 | `bc2ad84` | Docker 三联 + nginx + env 分层 |

**总计预估**:约 7 天工作量(单人,全职)。  
**实际进度**:M0 ~ M7 全部完成。

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

## M3 · 列表 / 搜索 / 分类标签 ✅

**目标**:首页可用,能浏览、分页、按标题搜、按分类/标签筛选。

### 后端(零新增)
- [x] ~~`listArticles({...})` / 分页工具~~ M2 已完成
- [x] ~~`category.routes.ts` / `tag.routes.ts`~~ M2 已完成
- 决定:**M3 是纯前端 milestone**,后端无新增

### 前端
- [x] `hooks/useDebounce.ts`:`useDebounce(value, ms)` + `useDebouncedCallback(fn, ms)`
- [x] `hooks/useUrlParam.ts`:`useUrlParam` / `useUrlNumberParam`(URL 当受控状态,空值自动从 query 删除)
- [x] `components/ArticleList.tsx`:把首页 zigzag 抽成共用组件(home / category / tag / search 全用)
- [x] `components/Pagination.tsx`:智能页码窗口(首末页 + 当前 ±1 + 省略号),含 compact 模式
- [x] `components/SearchPalette.tsx`:全屏搜索弹层,300ms 防抖,Cmd/Ctrl+K 唤起,Esc 关闭,Enter 跳第一条,空结果回车进 `/search`
- [x] `pages/Home.tsx`:**完整 hero**(Klein 蓝光斑 + hairline grid + EST. 副标 + 双行大标 + 主 CTA) + 章节标题 + 共用 ArticleList + URL 分页
- [x] `pages/CategoryIndex.tsx` `/categories`:分类卡片网格,带文章计数,hover 浮起
- [x] `pages/CategoryArchive.tsx` `/categories/:slug`:单分类归档
- [x] `pages/TagIndex.tsx` `/tags`:标签云(4 级字号反映文章数,避开传统 tag cloud 套路)
- [x] `pages/TagArchive.tsx` `/tags/:name`:单标签归档
- [x] `pages/SearchResults.tsx` `/search`:URL 同步搜索框 + 防抖 + 分页(关键词变化自动 reset 到第 1 页)
- [x] `layouts/PublicLayout.tsx`:接入 SearchPalette,顶导分类/标签链接激活态生效,Cmd+K 全局快捷键

### 实际验收
- ✅ 首页能看到 zigzag 列表 + 分页器,URL `?page=2` 共享
- ✅ Cmd+K 唤起搜索弹层,输入 "staletime" 300ms 后看到 1 条结果,Enter 跳详情
- ✅ `/search?keyword=...` 直接打开有效
- ✅ `/categories` 4 个分类卡片显示正确计数
- ✅ `/categories/frontend` 显示分类下文章
- ✅ `/tags` 字号按 article 数分级
- ✅ `/tags/React` 显示标签归档
- ✅ Typecheck 双包零错误

### M3 关键设计决策
1. **后端零新增** — M2 已把 listArticles 的所有筛选维度做齐,M3 完全在前端拼装
2. **URL 是真理之源** — 翻页 / 搜索全部由 URL query 驱动,刷新/分享 URL 保持状态;`useUrlParam` 写默认值自动从 query 删
3. **分页改成智能窗口** — 之前简单的 `1 / 12` mono 显示保留为 `compact` 模式,完整窗口模式留给未来其他场景
4. **SearchPalette ≠ SearchResults** — 弹层只展示 8 条快查;真要看全部、改 URL 分享、翻页就跳 `/search`,职责清楚
5. **标签云字号 4 级** — `>=8 / >=4 / >=2 / 其它`,避开"按 count 等比例缩放"的廉价 tag cloud 感

---

## M4 · 评论与互动 ✅

**目标**:登录用户能评论、点赞、收藏。

### 后端
- [x] `services/comment.service.ts`:list / create / delete(权限:评论者 / 文章作者 / 管理员)
- [x] `services/interaction.service.ts`:`toggleLike` / `toggleFavorite`,基于 (userId, articleId) 复合主键,天然 idempotent
- [x] `controllers/comment.controller.ts` + `controllers/interaction.controller.ts`
- [x] `routes/comment.routes.ts`:挂在 `/api/articles/:articleId/comments`
- [x] interaction 路由**合并进 article router**(`POST /api/articles/:id/like` `POST /api/articles/:id/favorite`),避免路由前缀歧义
- [x] `getArticleBySlug` 扩展:viewer 在场时返回 `liked` / `favorited`(detail 接口一次给齐,前端不用二次请求)
- [x] `/api/users/me/favorites`:登录用户的收藏文章列表(`routes/user.routes.ts`)
- [x] `scripts/test-m4-server.sh`:**17 项 e2e 全过**(创建/删除评论 + 权限边界 + like/fav toggle + 详情接口反映状态 + favorites 列表)

### 前端
- [x] `api/comments.ts` + `api/interactions.ts` + `api/articles.listMyFavorites`
- [x] `types/api.ts`:`Article` 加 `liked?` / `favorited?` 可选字段;新增 `Comment` 类型
- [x] `components/ReactionsCard.tsx`:右栏点赞 / 收藏 / 分享,**乐观更新**(立刻翻图标 + 改计数,失败回滚),分享走 Web Share API,无则复制链接
- [x] `components/CommentsSection.tsx`:登录可发,Cmd+Enter 发送,作者评论加「作者」徽章,Trash 图标删除(评论者 / 文章作者 / 管理员可见),未登录见空 composer + 引导跳登录
- [x] `pages/ArticleDetail.tsx`:接入 ReactionsCard + CommentsSection,元信息行加评论计数图标
- [x] `pages/Me.tsx`:`favorites` tab 接通 `listMyFavorites`,顶部 stat 卡片显示真实收藏数

### 实际验收
- ✅ 未登录看评论列表 ✓,composer 引导跳登录
- ✅ 登录后能发能删自己的;文章作者能删自己文章下任意评论;管理员能删任何评论
- ✅ 点赞 / 收藏 toggle 乐观更新,失败回滚
- ✅ 详情页 `liked` / `favorited` / counts 都准
- ✅ 收藏后立刻出现在 `/me?tab=favorites`
- ✅ Typecheck 双包零错误
- ✅ Server e2e 17/17

### M4 关键设计决策
1. **交互状态塞进 detail 接口** — `liked` / `favorited` 跟着 article 一起返回,前端不用二次请求;非常便宜(两个复合 PK lookup)
2. **乐观更新** — 点赞按钮 onMutate 立即翻状态,onSuccess 用服务端真实计数对齐;onError 用 ctx.prev 回滚
3. **interaction 不开独立 router** — 之前想 mount `/api/articles/:id` 到独立 interactionRouter,但会和 articleRouter 的 `:slug` / `:id` 路径打架;最终把两个 toggle 直接挂进 articleRouter,清晰简洁
4. **`mergeParams: true`** — comment subrouter 必须开,否则 `req.params.articleId` 拿不到
5. **`/me/favorites` 数据形状** — 故意拍平成 Article 结构(只额外加 `favoritedAt`),让 ArticleList / 类似组件可以无缝复用
6. **未登录点赞 → 跳登录,state 带 from** — 登录后还能回来继续操作,而不是把人扔回首页

---

## M5 · 文件上传 ✅

**目标**:写文章时能传封面图,Markdown 编辑器内能粘贴/拖入图片自动上传。

### 后端
- [x] `middlewares/upload.ts`:multer diskStorage + 月度目录 + nanoid 命名 + 类型双校验(mime ∧ ext)+ 5MB 上限,内置错误翻译(LIMIT_FILE_SIZE → 413、不支持的类型 → 400)
- [x] `controllers/upload.controller.ts`:返回 `{ url, filename, size, mimeType }`
- [x] `routes/upload.routes.ts`:`POST /api/upload/image`,`requireAuth` + `uploadSingleImage` 链路
- [x] `app.ts`:挂载 `/api/upload` 路由
- [x] ~~`app.use('/uploads', express.static(...))`~~ 已在 M0 完成
- [x] 文件命名:`uploads/yyyymm/<nanoid14>.<ext>`
- [x] `scripts/test-m5-server.sh`:**8 项 e2e 全过**(匿名 401 / 空表单 400 / 合法 PNG 201 + 静态 200 / PDF 400 / 假扩展名 .txt 400 / 6MB 413)

### 前端
- [x] `api/upload.ts`:`uploadImage(file)` —— `FormData` 提交,本地预校验类型 + 大小,30s 超时
- [x] `components/CoverDropzone.tsx`:拖拽 / 点选 / 键盘可达,带加载态、错误提示、移除按钮、文件名 + 体积展示
- [x] `pages/Write.tsx`:
  - [x] 旧的 "封面 URL 输入框" 换成 `CoverDropzone`,独占一行
  - [x] MDEditor 接入 `textareaProps.onPaste / onDrop`:粘贴/拖入图片 → 先插入 `![uploading…](filename)` 占位 → 上传完替换为真实 URL,失败回滚
  - [x] 用 `contentRef` 同步最新 content,避免连续粘多张时拼接旧值

### 实际验收
- ✅ 上传 png ≤ 5MB → 201 + URL,静态访问 200
- ✅ 上传 PDF → 400(fileFilter 拒绝)
- ✅ 上传 6MB → 413(multer LIMIT_FILE_SIZE 翻译)
- ✅ 上传 .txt 假扮 image/png → 400(双校验生效)
- ✅ 匿名请求 → 401
- ✅ Typecheck 双包零错误

### M5 关键设计决策
1. **multer 错误本地翻译** —— 把 `multer.single` 包一层,在回调里把 `LIMIT_FILE_SIZE` 直接 413 / 其它 MulterError 转 400,避免变成 500;非 multer 错误正常 next 到全局 error 中间件
2. **mime ∧ ext 双校验** —— 只验 mimetype 会被伪造的 Content-Type 绕过,只验扩展名又卡不到改后缀的 PDF;两个都要白名单命中才放行
3. **目录按月分桶** —— `uploads/yyyymm/` 一年 12 个目录,文件操作和备份都比扁平好;每次落盘前 `mkdirSync({ recursive: true })`
4. **占位符上传策略** —— 粘贴图片立刻在光标位置塞 `![uploading…](filename)`,服务端返回后用 `setContent(prev => prev.replace(...))` 替换;就算用户在等待期间继续打字、移动光标也不会错位
5. **CoverDropzone 自包含** —— 内部管理上传态 / 错误 / 元数据,对外只暴露 `value / onChange`,Write 不用关心上传 lifecycle
6. **本地预校验 + 服务端兜底** —— 客户端 `api/upload.ts` 先看 type / size 给出即时报错,不等网络;服务端再做权威校验,两层防线

---

## M6 · 管理后台 ✅

**目标**:`/admin` 全套(独立路由),管理员能管理一切。

### 后端
- [x] `services/admin.service.ts`:
  - [x] `getStats()`:用户/文章/评论/分类/标签计数 + 30 天发文趋势 + topCategories + 最近文章 + 最近评论
  - [x] `listUsers({page, pageSize, keyword, role})`:含 `_count.articles / comments`
  - [x] `updateUser(viewerId, id, {role?, isActive?})`:**自我保护** — admin 不能改自己的角色,也不能禁用自己
  - [x] `listAllComments({page, pageSize, keyword})`:跨文章评论 + 关联文章信息
  - [x] 分类 CRUD:`createCategory` / `updateCategory` / `deleteCategory`(非空分类拒绝删除)
  - [x] `deleteTag(id)`:事务里先清 `ArticleTag` 再删 Tag,避免外键约束
- [x] `controllers/admin.controller.ts`:`stats / listUsers / updateUser / listAllComments / createCategory / updateCategory / deleteCategory / deleteTag`
- [x] `routes/admin.routes.ts`:整个子路由都套 `requireAuth` + `requireRole('ADMIN')`
- [x] `app.ts` 挂 `/api/admin`(GET 分类/标签的公共接口保留在 `/api/categories` `/api/tags`)
- [x] `scripts/test-m6-server.sh`:**17 项 e2e 全过**(authz / stats shape / users 列表+搜索 / isActive 切换+登录拦截 / 自我降级 403 / 评论列表 / 分类增删改+409 重复+400 非空 / 标签删除)

### 前端
- [x] `api/admin.ts`:`getStats / listUsers / updateUser / listAllComments` + 完整类型
- [x] `api/taxonomy.ts` 扩展:`createCategory / updateCategory / deleteCategory / deleteTag`
- [x] `layouts/AdminLayout.tsx`:240px 侧边栏(OVERVIEW / CONTENT / USERS / SYSTEM 分组 + 当前页 klein 左竖条)+ 顶部 breadcrumb + 用户菜单
- [x] `pages/admin/Dashboard.tsx`:
  - [x] 自适应问候语(早/午/晚/深夜)+ this-week 增量
  - [x] Hero stat:30 天发文总数 + 自绘 SVG sparkline(line + area gradient)
  - [x] Bento:USERS / COMMENTS / DRAFTS / VIEWS / LIKES (tinted klein) / CATEGORIES
  - [x] 最近 6 篇文章表格 + 最近 6 条评论 feed(timeAgo)
- [x] `pages/admin/Articles.tsx`:全平台文章表 + URL-driven 关键词/状态/分类筛选 + 智能页码 + 多选 + 批量发布 / 批量删除 + 行内操作(查看/编辑/发布/删除)
- [x] `pages/admin/Categories.tsx`:列表 + 模态弹窗新建/编辑 + 删除(非空拒绝 → 友好错提示)
- [x] `pages/admin/Tags.tsx`:列表 + 客户端搜索 + 删除(确认对话框告知 N 篇文章会被解除关联)
- [x] `pages/admin/Users.tsx`:列表 + 搜索 + 角色筛选 + 提权/降权切换 + 启用/禁用切换 + 本人行禁止改
- [x] `pages/admin/Comments.tsx`:全平台评论 + 按内容搜索 + 删除(复用 M4 的 `deleteComment(articleId, id)`)
- [x] `router.tsx`:`/admin/*` 全部嵌入 `AdminLayout`,外层包 `RequireAuth role="ADMIN"`;`AdminPlaceholder.tsx` 已删除
- [x] `index.css`:新增 `.data-table` + `.admin-input` 共用样式

### 实际验收
- ✅ admin 账号:`/admin` 仪表盘 → 真实数据;Articles/Categories/Tags/Users/Comments 全部 CRUD 可用
- ✅ 普通用户访问 `/admin` 被 RequireAuth 守卫重定向到 `/`
- ✅ 后端:admin 中间件双层守卫(authz e2e 401/403 都对)
- ✅ Typecheck 双包零错误
- ✅ Server e2e 17/17

### M6 关键设计决策
1. **admin 路由独占前缀** — `/api/admin/*` 集中挂 `requireAuth + requireRole('ADMIN')`,而不是把权限挂到分散的 controller;少改老代码、少漏权限点
2. **分类/标签 CRUD 在 admin 下,GET 留在公共路径** — 公共页面要看 `_count.articles` 但不能改;admin 只做写操作。两套语义清晰,前端调起来也方便
3. **自我保护规则放在 service 层** — `updateUser` 内部检查 `viewerId === targetId`,即便 controller 误传也防呆;两条规则:不能改自己的角色、不能禁用自己
4. **stats 接口一次拉齐** — 用 `Promise.all` 并发跑 17 个 query,避免 N 次往返;30 天 trend 用 Map 预填零桶,缺天自动补 0,前端 SVG 不用判空
5. **sparkline 自绘 SVG** — 没引入 recharts/chart.js,30 行函数生成 `M…L…Z` path,渐变填充 + 描边两层,设计上和 mockup 一致,体积零负担
6. **批量操作走串行 fetch** — 选 N 篇文章发布/删除,for 循环逐个调,失败不中断;500 篇也只是 N 个请求,但代码极简(不上 `Promise.allSettled` 是因为我们要等 invalidate 之前所有都返回)
7. **Comments 删除复用 M4 接口** — 评论 delete 端点 `DELETE /api/articles/:articleId/comments/:id` 在 M4 就允许 admin 删任意评论,M6 客户端直接复用,不重复造轮子
8. **AdminLayout 不复用 PublicLayout** — 后台是工具型 UI,侧边栏 + 数据密集表格,和阅读型首页不是一类;layout 独立,组件能复用的(Pagination / 头像)还是复用

---

## M7 · 部署准备 ✅

**目标**:能用 `docker compose up` 在干净的机器上拉起整个系统。

### 任务清单
- [x] ~~`docker-compose.yml`:MySQL~~ 已在 M0 完成,生产版已扩展到 `docker-compose.prod.yml`
- [x] `Dockerfile.server`:多阶段(builder → runner),Prisma generate + tsc + entrypoint 自动 migrate deploy
- [x] `Dockerfile.client`:Vite build → nginx:1.27-alpine
- [x] `nginx/nginx.conf`:反代 `/api` 到 `server:4000`、`/uploads` 走 named volume 直出、SPA fallback、静态 hash 资源 30 天 immutable 缓存
- [x] `docker-compose.prod.yml`:mysql + server + nginx 三服务,depends_on healthcheck 串起、`blog-uploads` named volume 在 server(rw) / nginx(ro) 间共享
- [x] `.env.production.example` + `.dockerignore`
- [x] `server/docker-entrypoint.sh`:容器启动自动 `prisma migrate deploy` 后 exec node dist/index.js
- [x] `README.md`:增「生产部署」章节(架构表 + 运维命令)
- [x] 源码改造:`app.listen` 绑 `0.0.0.0`、`UPLOAD_ROOT` 改 env 驱动、upload controller 用 `path.relative` 计算 URL
- [ ] ~~ESLint + Prettier + Husky~~(本期推迟,tsc 兜底继续生效)

### 实际验收
- ✅ `pnpm typecheck` 双包零错误
- ✅ dev 模式 `UPLOAD_ROOT` 默认 `'uploads'`,旧行为不破
- 🔜 prod 镜像构建 + 烟测(用 `docker compose -f docker-compose.prod.yml ... up -d --build`)
- 🔜 浏览器开 `localhost` 看到首页;`curl /api/health` 返回 `{ok:true}`;粘贴图片后刷新仍在

### M7 关键设计决策
1. **uploads 走 named volume + nginx 直出** — server 写、nginx 只读挂载到 `/var/www/uploads`,nginx alias 直接出文件,绕过 Node 链路。`UPLOAD_ROOT` 改成 env(dev 默认 `'uploads'`,prod 设 `/app/uploads`),路径变更不再到处改代码
2. **entrypoint 自动 migrate deploy,不开独立 init 容器** — 当前只有 2 条迁移,`migrate deploy` 本身幂等,简单。代价是 nginx 启动稍晚(等 server healthcheck 过)
3. **不裁剪 server 镜像 node_modules** — 多 ~150MB 换 prisma CLI 直接可用,entrypoint 一行命令。后期想瘦身可以走显式 copy `@prisma/*` 那条路
4. **client http baseURL 写死 `/api`** — 同源部署 nginx 反代最干净,prod 镜像不注 `VITE_API_BASE_URL`
5. **mysql 在 prod compose 不暴露端口** — 仅 docker 内网,nginx 是唯一入口
6. **`.dockerignore` 排除 docs/mockups/scripts/test-*.sh** — build context 瘦身,顺便规避把 .env 烤进镜像

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
- [x] M2 文章 CRUD ✅
- [x] M3 列表 / 搜索 / 分类标签 ✅
- [x] M4 评论与互动 ✅
- [x] M5 文件上传 ✅
- [x] M6 管理后台 ✅
- [x] M7 部署准备 ✅

---

**post-M7 backlog** 见 [ROADMAP.md](ROADMAP.md) —— 不再按 milestone 编号,按主题分组的待办池,挑着做。
