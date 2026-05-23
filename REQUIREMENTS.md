# 个人博客系统 — 需求文档

> 版本:v1.0  
> 日期:2026-05-23

---

## 1. 项目概述

一个支持多用户的博客平台。注册用户可发布、编辑、删除自己的 Markdown 文章,访客可浏览、检索文章并查看评论。系统提供独立的管理后台用于平台维护。

### 1.1 项目目标
- 提供完整的文章发布与阅读体验
- 支持分类、标签的内容组织
- 提供用户互动能力(评论、点赞、收藏)
- 提供独立的管理后台,便于平台维护

### 1.2 部署目标
本地开发 → 后续部署到云服务器(预留 Docker 化与环境变量分层)。

---

## 2. 角色与权限

| 角色 | 描述 | 核心权限 |
|---|---|---|
| **访客** | 未登录用户 | 浏览已发布文章、查看分类/标签/评论 |
| **普通用户** | 已注册登录 | 发布/编辑/删除**自己的**文章;评论;点赞;收藏 |
| **管理员** | 平台维护者 | 管理所有文章/评论/分类/用户;访问 `/admin` 后台 |

权限通过 JWT payload 中的 `role` 字段 + 后端中间件校验。

---

## 3. 功能需求

### 3.1 文章模块

| 字段 | 说明 |
|---|---|
| 标题 | 必填,≤ 100 字符 |
| Slug | 由标题生成,文章 URL 标识 |
| 摘要 | 可选,≤ 200 字符;为空时自动截取正文前 N 字 |
| 正文 | Markdown 格式,必填 |
| 封面图 | 可选,上传到本地 `uploads/` |
| 分类 | 必选一个(从管理员预设的分类中) |
| 标签 | 多选/自由填写,自动去重 |
| 状态 | `draft`(草稿) / `published`(已发布) |
| 浏览量 | 每次访问详情页 +1,带简单防刷(同 IP 短时间内不重复计数) |
| 作者 | 关联 User |
| 时间 | createdAt / updatedAt / publishedAt |

**操作:**
- 创建/编辑/删除(仅作者本人或管理员)
- 草稿仅作者可见,已发布对所有人可见
- 发布动作:`draft → published`

**编辑器:** `@uiw/react-md-editor`(左写右预览)。

### 3.2 分类与标签

- **分类**:管理员在 `/admin` 维护;每篇文章必选一个;字段:`name`、`slug`
- **标签**:用户在发文时自由填写,系统自动去重(按 name);可被多篇文章共享

### 3.3 评论模块

- 必须登录才能发表评论
- 平铺列表(不做楼中楼回复)
- 字段:内容、作者、所属文章、创建时间
- 删除权限:评论者本人 / 文章作者 / 管理员

### 3.4 互动模块

- **点赞**:登录用户可对文章点赞/取消点赞(联合唯一:`userId + articleId`)
- **收藏**:登录用户可收藏/取消收藏文章,可在个人中心查看收藏列表

### 3.5 用户模块

- **注册**:用户名 + 邮箱 + 密码(bcrypt 哈希存储)
- **登录**:用户名或邮箱 + 密码 → 返回 JWT
- **个人中心**:
  - 我的文章(已发布 + 草稿,分 tab)
  - 我的收藏
  - 资料编辑(头像、昵称、简介)

### 3.6 首页与列表

- **首页**:展示已发布文章列表,按发布时间倒序
- **分页**:每页 10 条(可配置)
- **搜索**:仅按**文章标题**模糊匹配(`LIKE %keyword%`)
- **筛选**:可按分类、标签筛选

### 3.7 管理后台 `/admin`

独立路由,仅管理员可访问。包含:

- 仪表盘(文章数、用户数、评论数、近 7 日发文趋势)
- 文章管理(列表、强制下架/删除、查看任意作者文章)
- 分类管理(增删改查)
- 标签管理(查看 + 删除)
- 用户管理(列表、禁用/启用、修改角色)
- 评论管理(列表、删除)

---

## 4. 技术栈

### 4.1 前端

| 项 | 选型 |
|---|---|
| 框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 样式 | Tailwind CSS |
| 路由 | React Router v6 |
| 服务端状态 | TanStack Query (React Query) |
| 表单 | React Hook Form + Zod |
| Markdown 编辑器 | `@uiw/react-md-editor` |
| Markdown 渲染 | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| HTTP 客户端 | Axios |
| 图标 | lucide-react |

### 4.2 后端

| 项 | 选型 |
|---|---|
| 运行时 | Node.js (LTS) |
| 框架 | Express + TypeScript |
| ORM | Prisma |
| 数据库 | MySQL 8 |
| 认证 | JWT (`jsonwebtoken`) + bcrypt |
| 文件上传 | multer(本地磁盘) |
| 静态托管 | `express.static('uploads')` |
| 校验 | Zod |
| 日志 | pino |
| 环境变量 | dotenv |

### 4.3 工程结构(Monorepo)

```
your-blog/
├── client/                 # 前端 (React + Vite)
│   ├── src/
│   │   ├── pages/          # 路由页面
│   │   │   ├── public/     # 访客页面(首页、详情、登录、注册)
│   │   │   ├── user/       # 普通用户页面(写文章、个人中心)
│   │   │   └── admin/      # 管理后台页面
│   │   ├── components/     # 通用组件
│   │   ├── api/            # 接口封装
│   │   ├── hooks/
│   │   ├── stores/         # 客户端状态(用户 / 主题)
│   │   ├── types/          # 与后端共享的类型(或从 server 引入)
│   │   └── utils/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                 # 后端 (Express + Prisma)
│   ├── src/
│   │   ├── routes/         # 路由
│   │   ├── controllers/    # 控制器
│   │   ├── services/       # 业务逻辑
│   │   ├── middlewares/    # auth / role / error / upload
│   │   ├── utils/
│   │   ├── config/
│   │   ├── types/
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── uploads/            # 用户上传的图片
│   └── package.json
│
├── package.json            # 根 package.json (pnpm workspaces)
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
├── REQUIREMENTS.md
└── README.md
```

包管理:**pnpm workspaces**。

---

## 5. 数据模型(Prisma)

```prisma
// 用户
model User {
  id           Int        @id @default(autoincrement())
  username     String     @unique
  email        String     @unique
  passwordHash String
  role         Role       @default(USER)
  avatar       String?
  bio          String?    @db.VarChar(200)
  isActive     Boolean    @default(true)
  createdAt    DateTime   @default(now())

  articles     Article[]
  comments     Comment[]
  likes        Like[]
  favorites    Favorite[]
}

enum Role {
  USER
  ADMIN
}

// 分类
model Category {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  slug      String    @unique
  articles  Article[]
}

// 标签
model Tag {
  id        Int          @id @default(autoincrement())
  name      String       @unique
  articles  ArticleTag[]
}

// 文章
model Article {
  id           Int           @id @default(autoincrement())
  title        String        @db.VarChar(100)
  slug         String        @unique
  summary      String?       @db.VarChar(200)
  content      String        @db.LongText
  coverUrl     String?
  status       ArticleStatus @default(DRAFT)
  viewCount    Int           @default(0)
  authorId     Int
  categoryId   Int
  publishedAt  DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  author       User          @relation(fields: [authorId], references: [id])
  category     Category      @relation(fields: [categoryId], references: [id])
  tags         ArticleTag[]
  comments     Comment[]
  likes        Like[]
  favorites    Favorite[]

  @@index([status, publishedAt])
  @@index([authorId])
}

enum ArticleStatus {
  DRAFT
  PUBLISHED
}

// 文章 - 标签 多对多
model ArticleTag {
  articleId Int
  tagId     Int
  article   Article @relation(fields: [articleId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id])

  @@id([articleId, tagId])
}

// 评论
model Comment {
  id        Int      @id @default(autoincrement())
  content   String   @db.VarChar(1000)
  articleId Int
  userId    Int
  createdAt DateTime @default(now())

  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])

  @@index([articleId])
}

// 点赞
model Like {
  userId    Int
  articleId Int
  createdAt DateTime @default(now())

  user      User    @relation(fields: [userId], references: [id])
  article   Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@id([userId, articleId])
}

// 收藏
model Favorite {
  userId    Int
  articleId Int
  createdAt DateTime @default(now())

  user      User    @relation(fields: [userId], references: [id])
  article   Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@id([userId, articleId])
}
```

---

## 6. API 接口列表(预览)

> 全部以 `/api` 为前缀。需登录的接口要求 `Authorization: Bearer <token>`。

### 6.1 认证 `/api/auth`
| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/register` | 注册 | 公开 |
| POST | `/login` | 登录,返回 JWT | 公开 |
| GET  | `/me` | 当前用户信息 | 登录 |

### 6.2 文章 `/api/articles`
| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET    | `/` | 文章列表(支持 `page`、`keyword`、`categoryId`、`tagId`) | 公开 |
| GET    | `/:slug` | 文章详情(浏览量 +1) | 公开 |
| POST   | `/` | 创建文章 | 登录 |
| PUT    | `/:id` | 更新文章 | 作者/管理员 |
| DELETE | `/:id` | 删除文章 | 作者/管理员 |
| POST   | `/:id/publish` | 发布草稿 | 作者/管理员 |
| POST   | `/:id/like` | 点赞/取消 | 登录 |
| POST   | `/:id/favorite` | 收藏/取消 | 登录 |

### 6.3 评论 `/api/articles/:articleId/comments`
| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET    | `/` | 评论列表 | 公开 |
| POST   | `/` | 发表评论 | 登录 |
| DELETE | `/:id` | 删除评论 | 评论者/文章作者/管理员 |

### 6.4 分类 `/api/categories`
| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET    | `/` | 分类列表 | 公开 |
| POST   | `/` | 新建分类 | 管理员 |
| PUT    | `/:id` | 修改分类 | 管理员 |
| DELETE | `/:id` | 删除分类 | 管理员 |

### 6.5 标签 `/api/tags`
| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET    | `/` | 标签列表 | 公开 |
| DELETE | `/:id` | 删除标签 | 管理员 |

### 6.6 用户 `/api/users`
| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET  | `/me/articles` | 我的文章(含草稿) | 登录 |
| GET  | `/me/favorites` | 我的收藏 | 登录 |
| PUT  | `/me` | 修改个人资料 | 登录 |

### 6.7 上传 `/api/upload`
| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/image` | 上传图片(封面/正文图),返回 URL | 登录 |

### 6.8 后台 `/api/admin`
| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET    | `/stats` | 仪表盘统计 | 管理员 |
| GET    | `/users` | 用户列表 | 管理员 |
| PATCH  | `/users/:id` | 修改用户状态/角色 | 管理员 |
| GET    | `/comments` | 评论列表(全平台) | 管理员 |

---

## 7. 前端页面与路由

### 7.1 访客 / 普通用户(主站)
| 路径 | 页面 | 权限 |
|---|---|---|
| `/` | 首页(文章列表 + 搜索) | 公开 |
| `/articles/:slug` | 文章详情 | 公开 |
| `/categories/:slug` | 分类下文章列表 | 公开 |
| `/tags/:name` | 标签下文章列表 | 公开 |
| `/login` | 登录 | 公开 |
| `/register` | 注册 | 公开 |
| `/me` | 个人中心(我的文章 / 草稿 / 收藏 / 资料) | 登录 |
| `/write` | 新建文章 | 登录 |
| `/write/:id` | 编辑文章 | 作者 |

### 7.2 管理后台
| 路径 | 页面 |
|---|---|
| `/admin` | 仪表盘 |
| `/admin/articles` | 文章管理 |
| `/admin/categories` | 分类管理 |
| `/admin/tags` | 标签管理 |
| `/admin/users` | 用户管理 |
| `/admin/comments` | 评论管理 |

---

## 8. 安全 & 工程实践

- **密码**:bcrypt(salt rounds = 10),不返回明文/哈希
- **JWT**:`HS256`,默认有效期 7 天,签发密钥放 `.env`
- **CORS**:允许前端域名,生产/开发分别配置
- **请求校验**:所有 body / query 用 Zod 校验,失败统一返回 400
- **错误处理**:全局错误中间件,返回 `{ code, message }` 格式
- **限流**(可选,后续):`express-rate-limit` 给登录/注册/评论加保护
- **文件上传**:限制类型(image/*)、限制大小(≤ 5MB)、随机文件名
- **XSS**:Markdown 渲染默认转义,代码块走 highlight,允许有限 HTML 时用 `rehype-sanitize`
- **SQL 注入**:Prisma 参数化查询天然防御
- **环境变量**:`.env.example` 入库,真实 `.env` 加入 `.gitignore`

---

## 9. 开发里程碑(建议)

| 阶段 | 内容 | 产出 |
|---|---|---|
| **M0** 基础工程 | Monorepo 初始化、前后端脚手架、Prisma + MySQL 连通 | 可启动的空壳 |
| **M1** 用户体系 | 注册、登录、JWT、角色中间件 | 能登录拿 token |
| **M2** 文章 CRUD | Article + Category + Tag 模型与接口、Markdown 编辑器 | 能写、发、看文章 |
| **M3** 列表与搜索 | 首页、分页、标题搜索、分类/标签筛选 | 主站可用 |
| **M4** 评论 & 互动 | 评论、点赞、收藏 | 用户互动闭环 |
| **M5** 文件上传 | 封面图、正文图上传 | 编辑体验完整 |
| **M6** 管理后台 | `/admin` 全套页面 | 平台可维护 |
| **M7** 部署准备 | Dockerfile、env 分层、生产构建 | 可上云 |

---

## 10. 待定 / 未来扩展(本期不做)

- 第三方登录(GitHub / Google)
- 评论楼中楼
- 全文搜索(Meilisearch)
- 文章订阅 / RSS
- 邮件通知
- 多语言 i18n
