# 开发计划

> 配套阅读:[REQUIREMENTS.md](REQUIREMENTS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [UI_DESIGN.md](UI_DESIGN.md)  
> 版本:v1.0 · 2026-05-23

---

## 总览

按 8 个里程碑推进。每个里程碑都有**明确产出**和**验收点**,完成验收才进下一阶段。

| 阶段 | 名称 | 预估工作量 | 核心产出 |
|---|---|---|---|
| M0 | 工程脚手架 | 0.5 天 | 前后端可启动空壳 + DB 通 |
| M1 | 用户体系 | 1 天 | 注册/登录/JWT/角色守卫 |
| M2 | 文章 CRUD | 1.5 天 | 写、改、删、看文章 |
| M3 | 列表 / 搜索 / 分类标签 | 1 天 | 首页可用 |
| M4 | 评论与互动 | 0.5 天 | 评论 + 点赞 + 收藏 |
| M5 | 文件上传 | 0.5 天 | 封面图、正文图 |
| M6 | 管理后台 | 1.5 天 | `/admin` 全套 |
| M7 | 部署准备 | 0.5 天 | Dockerfile + env 分层 |

**总计预估**:约 7 天工作量(单人,全职)。

---

## M0 · 工程脚手架

**目标**:跑通 `pnpm dev` 同时启动前后端,后端能连到本地 MySQL,前端打开是一个 hello 页。

### 任务清单
- [ ] 初始化根目录 `package.json`、`pnpm-workspace.yaml`
- [ ] `client/`:`pnpm create vite` + React + TS,装 Tailwind + React Router + TanStack Query + axios + Zustand + lucide-react
- [ ] `server/`:`pnpm init`,装 express + ts + tsx + zod + prisma + bcrypt + jsonwebtoken + multer + pino + helmet + cors
- [ ] 根目录 `tsconfig.base.json`,`client/server` 各自继承
- [ ] 根目录 ESLint + Prettier 统一配置;Husky + lint-staged
- [ ] `.env.example` 模板;`.gitignore` 覆盖 `node_modules`、`.env`、`dist`、`uploads`
- [ ] `server/prisma/schema.prisma` 写入完整 schema(REQUIREMENTS.md 第 5 节)
- [ ] 本地 MySQL 起一个 `your_blog_dev` 库
- [ ] `prisma migrate dev --name init` 跑通
- [ ] `server`:写一个 `GET /api/health` 返回 `{ok: true}`
- [ ] `client`:首页 fetch `/api/health` 并显示
- [ ] 根目录 `pnpm dev` 用 `concurrently` 同时拉前后端
- [ ] `git init` + 首次提交

### 验收
- 浏览器打开 `localhost:5173` 看到 hello + health ok
- `prisma studio` 能看到 8 张表
- `pnpm lint` 不报错

---

## M1 · 用户体系

**目标**:用户能注册、登录、拿到 JWT,前端能识别登录态,角色守卫工作。

### 后端
- [ ] `utils/password.ts`:bcrypt 包装
- [ ] `utils/jwt.ts`:sign / verify
- [ ] `middlewares/auth.ts`:解 token → `req.user`(可选)
- [ ] `middlewares/requireAuth.ts`:必须登录
- [ ] `middlewares/requireRole.ts`:角色检查
- [ ] `middlewares/validate.ts`:Zod schema → 校验
- [ ] `middlewares/error.ts`:全局错误拦截 + 统一返回格式
- [ ] `services/auth.service.ts`:register / login / me
- [ ] `controllers/auth.controller.ts`
- [ ] `routes/auth.routes.ts`
- [ ] 注入到 `app.ts`
- [ ] 写 seed:创建一个 admin 用户(`pnpm prisma db seed`)

### 前端
- [ ] `api/http.ts`:axios 拦截器(塞 token、401 跳 `/login`)
- [ ] `api/auth.ts`:register / login / me
- [ ] `stores/auth.store.ts`:Zustand 管理 user + token,持久化到 `localStorage`
- [ ] `pages/Login.tsx` + `pages/Register.tsx`:RHF + Zod
- [ ] `components/RequireAuth.tsx`:路由守卫
- [ ] `components/RequireRole.tsx`:角色守卫
- [ ] `layouts/PublicLayout.tsx`:顶部导航根据登录态切换显示

### 验收
- 能用脚本注册新用户
- 登录后 localStorage 有 token,刷新页面仍是登录态
- 访问 `/me` 未登录会跳 `/login`
- 用 admin 账号能访问 `/admin`(此时是占位页),普通账号不能

---

## M2 · 文章 CRUD

**目标**:登录用户能创建、编辑、删除自己的文章,所有人能看详情。

### 后端
- [ ] `services/article.service.ts`:
  - `createArticle(authorId, data)`:生成 slug、关联 tags(自动 upsert)
  - `updateArticle(articleId, userId, role, data)`:校验权限
  - `deleteArticle(articleId, userId, role)`
  - `publishArticle(articleId, userId, role)`:`draft → published` + 设 `publishedAt`
  - `getArticleBySlug(slug, currentUserId?)`:草稿仅作者可见
- [ ] `utils/slug.ts`:中文 → 拼音或 nanoid 兜底,保证 unique
- [ ] `controllers/article.controller.ts`
- [ ] `routes/article.routes.ts`
- [ ] Zod schema 校验:title 1–100、content 必填、categoryId 必须存在等

### 前端
- [ ] `api/articles.ts` + `hooks/useArticle.ts`
- [ ] `pages/Write.tsx`:
  - 集成 `@uiw/react-md-editor`(左写右预览)
  - 表单:标题、摘要、分类下拉、标签输入(支持回车添加)、封面图 URL(M5 前先用 URL 输入)
  - 底部:保存草稿 / 发布
- [ ] `pages/ArticleDetail.tsx`:Markdown 渲染 + 高亮
- [ ] `pages/UserMe.tsx`:我的文章 / 草稿 tab
- [ ] 编辑模式:`/write/:id` 复用写文章页

### 验收
- 写一篇文章保存为草稿 → `/me` 草稿 tab 可见、详情页他人 404
- 发布后他人能在详情页看到
- 编辑后保存,内容更新
- 删除后详情页 404

---

## M3 · 列表 / 搜索 / 分类标签

**目标**:首页可用,能浏览、分页、按标题搜、按分类/标签筛选。

### 后端
- [ ] `services/article.service.ts` 加 `listArticles({page, pageSize, keyword, categoryId, tagId, status})`
- [ ] `services/category.service.ts` + `controllers` + `routes`(管理员才能改,所有人能查)
- [ ] `services/tag.service.ts` + `controllers` + `routes`
- [ ] 分页工具 `utils/pagination.ts`:统一返回 `{items, total, page, pageSize}`

### 前端
- [ ] `pages/Home.tsx`:文章卡片列表 + 分页器 + 搜索框 + 分类标签筛选
- [ ] `components/ArticleCard.tsx`:封面图 + 标题 + 摘要 + 分类徽章 + 标签 + 作者 + 时间
- [ ] `pages/CategoryArchive.tsx` `/categories/:slug`
- [ ] `pages/TagArchive.tsx` `/tags/:name`
- [ ] 搜索:输入框防抖 300ms,改 URL query,Query Hook 自动重 fetch

### 验收
- 首页能看到列表(种几篇 seed 数据)
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

### 前端
- [ ] `components/CommentList.tsx` + `CommentForm.tsx`
- [ ] 详情页右下浮动:点赞/收藏按钮(图标 + 计数)
- [ ] `pages/UserMe.tsx` 加"我的收藏"tab

### 验收
- 未登录看到评论列表但不能发
- 登录后能发、能删自己的
- 点赞/收藏 toggle 正常
- "我的收藏"显示收藏过的文章

---

## M5 · 文件上传

**目标**:写文章时能传封面图,Markdown 编辑器内能粘贴/拖入图片自动上传。

### 后端
- [ ] `middlewares/upload.ts`:multer 配置(磁盘 + 类型 + 大小)
- [ ] `routes/upload.routes.ts`:`POST /api/upload/image` 必须登录
- [ ] `app.ts`:`app.use('/uploads', express.static(...))`
- [ ] 文件命名:`uploads/yyyymm/<nanoid>.<ext>`

### 前端
- [ ] `api/upload.ts`:`FormData` 上传
- [ ] `pages/Write.tsx`:
  - 封面图区域:拖拽 / 点选,上传完显示预览
  - Markdown 编辑器集成:粘贴/拖入图片自动上传,插入 `![](url)`(`@uiw/react-md-editor` 提供 onChange hook,可自行处理)

### 验收
- 上传 png/jpg/webp ≤ 5MB 成功,返回 URL
- 上传 PDF 报错 400
- 上传 6MB 文件报错 413(或 400)
- 预览图能看到

---

## M6 · 管理后台

**目标**:`/admin` 全套,管理员能管理一切。

### 后端
- [ ] `services/admin.service.ts`:
  - `stats()`:文章数、用户数、评论数、近 7 日发文趋势
  - `listUsers({page, keyword})`
  - `updateUser(id, {role?, isActive?})`
  - `listComments({page, keyword})`
- [ ] `routes/admin.routes.ts`:全套挂 `requireRole('ADMIN')`

### 前端
- [ ] `layouts/AdminLayout.tsx`:侧边栏 + 顶部 + 内容区
- [ ] `pages/admin/Dashboard.tsx`:数据卡片 + 趋势图(用 `recharts` 或 `apexcharts`)
- [ ] `pages/admin/Articles.tsx`:全平台文章表格 + 删除
- [ ] `pages/admin/Categories.tsx`:CRUD 表格
- [ ] `pages/admin/Tags.tsx`:列表 + 删除
- [ ] `pages/admin/Users.tsx`:列表 + 改角色 / 禁用切换
- [ ] `pages/admin/Comments.tsx`:全平台评论 + 删除

### 验收
- admin 账号能看到全部页面,数据正确
- 普通用户访问 `/admin` 被拦截到 `/` 或 403 页

---

## M7 · 部署准备

**目标**:能用 `docker compose up` 在干净的机器上拉起整个系统。

### 任务清单
- [ ] `Dockerfile.server`:多阶段(builder → runner),copy prisma migrations
- [ ] `Dockerfile.client`:Vite build → nginx alpine
- [ ] `nginx.conf`:反向代理 `/api` 到 server:4000,静态文件由 nginx 直出,`/uploads` 也走 nginx
- [ ] `docker-compose.yml`:nginx + server + mysql,volumes(uploads + mysql data)
- [ ] `.env.production.example`
- [ ] 启动脚本:容器内自动跑 `prisma migrate deploy`
- [ ] `README.md`:开发启动 + 生产部署两套说明

### 验收
- `cp .env.production.example .env.production` 填好密钥
- `docker compose up -d --build` 一次拉起
- 浏览器访问 `localhost` 看到首页

---

## 验收准则(适用于所有阶段)

每个里程碑结束前自查:

1. ✅ TypeScript 编译无错(`tsc --noEmit`)
2. ✅ `pnpm lint` 不报错
3. ✅ 手动测试覆盖里程碑列出的"验收"项
4. ✅ 关键改动有 commit,信息符合 `feat/fix/refactor` 规范
5. ⚠️ 如果时间紧,可以跳过测试代码,但**手动验收必须做**

---

## 风险与时间缓冲

| 风险点 | 缓冲策略 |
|---|---|
| Stitch 设计返工 | UI 方向选定后再码代码,避免组件重写 |
| Prisma schema 改动 | 早期数据可清空重建,不做迁移历史保留 |
| Markdown 编辑器集成深度 | 优先用 `@uiw/react-md-editor` 默认能力,自定义工具栏放到 M6 后 |
| 上传防刷 / 计数防刷 | 本期最简实现,后期可上 Redis |

---

## 当前位置

- [x] 需求文档 ✅
- [x] 技术架构 ✅
- [x] UI 方向(待选定)📍 **你在这里**
- [ ] Stitch 出图
- [ ] M0 工程脚手架
