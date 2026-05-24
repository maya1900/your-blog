# 墨记 · Slow Blog

一个慢工出细活的个人博客系统 — 写一点东西,把每行都写明白。
React + Express + Prisma + MySQL,**站点信息 / 关于页 / 用户资料全部在后台可改**。

> 项目状态:M7 完成 — `docker compose -f docker-compose.prod.yml up -d --build` 一键生产部署。  
> 主线进度见 [docs/DEV_PLAN.md](docs/DEV_PLAN.md),M6 后增量见 [CHANGELOG.md](CHANGELOG.md)。

---

## 功能

### 阅读侧(公共)

- 首页 zigzag 文章列表 + 智能分页(首末页 + 当前 ±1 + 省略号)
- 文章详情:Markdown 渲染 + 代码高亮(highlight.js)+ TOC + 中英文混排阅读时长估算
- 分类首页 + 分类归档
- 标签云(字号按文章数 4 级分级)+ 标签归档
- 全文搜索弹层 `Cmd / Ctrl + K`,300ms 防抖,Enter 跳第一条 / 空结果回车进 `/search`
- `/search` 完整结果页 — URL 同步搜索词与分页,可分享
- 关于页 `/about` — Markdown,后台可改

### 写作 / 个人中心

- 用户名 + 邮箱注册 / 登录,JWT (HS256, 7d) + bcrypt
- Markdown 编辑器(`@uiw/react-md-editor`)双栏预览
- **粘贴 / 拖入图片自动上传**,占位符策略避免连续粘贴错位
- 草稿 / 发布 / 编辑 / 删除,中文标题自动 nanoid slug
- 评论 + 点赞 + 收藏(乐观更新,失败回滚)
- 个人中心:已发布 / 草稿 / 收藏 / 资料 四个 tab
- 编辑个人资料:头像(点击 / 拖入上传)+ 用户名 + 简介
- 自助改密(必须验证当前密码)

### 管理后台 `/admin`

- 仪表盘:Bento stat 卡 + 30 天发文趋势(自绘 SVG sparkline,无图表库依赖)+ 最近文章 / 评论 feed
- 全平台文章管理:筛选(标题 / 状态 / 分类)+ 多选 + 批量发布 / 删除
- 评论管理:跨文章列表 + 内容搜索 + 删除
- 分类 CRUD(非空分类拒绝删除)/ 标签删除(级联清理 ArticleTag)
- 用户管理:头像 / 用户名 / 邮箱 / 简介 / 角色 / 启用全部可改 + 管理员重置密码;自我保护
- 关于页 Markdown 编辑器(实时预览)
- 站点信息:站点名 / 标语 / Logo / Favicon,改完立即生效

---

## 界面预览

7 张高保真 HTML mockup,浏览器直接打开:

| 页面 | mockup |
|---|---|
| 首页(hero + zigzag) | [01-home.html](mockups/01-home.html) |
| 文章详情(TOC + 互动栏) | [02-article-detail.html](mockups/02-article-detail.html) |
| 写文章 | [03-write.html](mockups/03-write.html) |
| 登录 | [04-login.html](mockups/04-login.html) |
| 个人中心 | [05-me.html](mockups/05-me.html) |
| 管理仪表盘 | [06-admin-dashboard.html](mockups/06-admin-dashboard.html) |
| 文章管理 | [07-admin-articles.html](mockups/07-admin-articles.html) |

或一次预览全部:[mockups/index.html](mockups/index.html)

设计语言:Aurora AI(Klein 蓝光斑 + 柔色雾化背景)· 细节见 [docs/DESIGN.md](docs/DESIGN.md)。

---

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 · TypeScript · Vite · Tailwind CSS 3.4 · React Router · TanStack Query · Zustand · React Hook Form · Zod |
| 后端 | Node 20 · Express · TypeScript · Prisma · zod · bcrypt · jsonwebtoken · multer · pino · helmet |
| DB | MySQL 8(本地 Docker compose) |
| 认证 | JWT (HS256, 7d) + bcrypt(10 round) |
| 编辑器 | `@uiw/react-md-editor` + react-markdown + remark-gfm + rehype-highlight + rehype-sanitize |
| 包管理 | pnpm workspaces |

---

## 开发环境要求

| 工具 | 版本 |
|---|---|
| Node | ≥ 20 |
| pnpm | ≥ 9 |
| Docker | 任意现代版本(用于跑 MySQL) |
| Git | 任意 |

---

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量(默认值匹配 docker-compose 中的 MySQL)
cp .env.example .env

# 3. 启动 MySQL
pnpm db:up

# 4. 等待 MySQL 健康(约 15-30s),然后跑 Prisma 迁移 + 种子
pnpm db:migrate
pnpm db:seed

# 5. 同时启动前后端
pnpm dev
```

打开:
- 前端 → http://localhost:5173
- 后端 → http://localhost:4000/api/health

### 演示账号

种子(`pnpm db:seed`)会创建:

| 角色 | 用户名 | 密码 |
|---|---|---|
| 管理员 | `admin` | `admin123` |

普通用户可以自己 `/register` 注册。要看更多文章数据,跑一下:

```bash
pnpm -C server db:seed-articles    # 5 篇示例文章 + 1 篇草稿
```

---

## 生产部署

整个系统打成 3 个容器:`mysql + server(node) + nginx(SPA + 反代)`。clone 仓库的干净机器上,装好 Docker 后:

```bash
# 1. 复制并编辑环境变量(JWT_SECRET / DB 密码必须改)
cp .env.production.example .env.production
$EDITOR .env.production

# 2. 一次构建并起栈
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 3. 等三个容器都 healthy(约 30-60s)
docker compose -f docker-compose.prod.yml ps

# 4. 首次启动:种子 admin + 默认分类 + 关于页
docker exec your-blog-server-prod \
  ./node_modules/.bin/tsx prisma/seed.ts
```

浏览器打开 `http://localhost`(默认 80 端口,可在 env 改 `HTTP_PORT`)。Server 容器启动时 entrypoint 会自动跑 `prisma migrate deploy`,重启幂等。

### 部署架构

| 层 | 容器 | 暴露 |
|---|---|---|
| 入口 | `nginx:1.27-alpine` | `80` → 宿主 `HTTP_PORT` |
| 应用 | `node:20-alpine`(Express + Prisma) | 仅 docker 内网 |
| 数据 | `mysql:8.4` | 仅 docker 内网 |

| 卷 | 用途 |
|---|---|
| `your-blog-mysql-data-prod` | MySQL 数据持久化 |
| `your-blog-uploads` | 用户上传:server 写、nginx 只读直出 `/uploads/*` |

### 常用运维

```bash
# 查看 server 日志
docker logs -f your-blog-server-prod

# 滚动升级(代码变了之后)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 完全清理(⚠ 含数据)
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
```

### 数据备份 / 恢复

**备份** — 一个脚本搞定,默认读 `.env.production`,产出单个 tar 包(含 mysqldump + uploads 卷快照 + manifest):

```bash
bash scripts/backup.sh
# → backups/your-blog-2026-05-24_143000.tar.gz (含 db.sql.gz + uploads.tar.gz + manifest.txt)
```

可选环境变量:`ENV_FILE`(默认 `.env.production`)、`BACKUP_DIR`(默认 `backups/`)、`MYSQL_CONTAINER` / `UPLOADS_VOLUME`(改容器/卷名)。配合 cron 定时上传到 S3/对象存储就是完整方案。

**恢复**(⚠ 会覆盖现有数据):

```bash
# 1. 解开备份
mkdir -p restore && tar xzf backups/your-blog-2026-05-24_143000.tar.gz -C restore

# 2. 恢复 MySQL(读取 .env.production 拿 root 密码 + 数据库名)
set -a; . .env.production; set +a
gunzip -c restore/db.sql.gz | docker exec -i your-blog-mysql-prod \
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"

# 3. 恢复 uploads 卷(清空旧的再灌入)
docker run --rm -v your-blog-uploads:/data -v "$PWD/restore":/in alpine:3 \
  sh -c 'rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null; tar xzf /in/uploads.tar.gz -C /data'

# 4. 重启 server 让连接池抓到新数据
docker compose -f docker-compose.prod.yml --env-file .env.production restart server
```

---

## 常用脚本

```bash
pnpm dev          # 同时启动 client + server (热重载)
pnpm build        # 构建 client + server
pnpm typecheck    # 全仓库 TypeScript 类型检查
pnpm lint         # 全仓库 lint(目前等同 typecheck,ESLint 留到 M7)

pnpm db:up        # 启动 MySQL 容器
pnpm db:down      # 停止 MySQL 容器(数据保留)
pnpm db:migrate   # 创建并应用迁移
pnpm db:seed      # 种子 admin / 分类 / 默认关于页
pnpm db:studio    # 打开 Prisma Studio (浏览数据)
pnpm db:reset     # ⚠ 重置数据库 + 重跑迁移 + 种子
```

### 端到端冒烟测试

各里程碑都附带 server e2e 脚本(基于 curl),server 跑起来后可以直接跑:

```bash
bash scripts/test-m2-server.sh    # 文章 CRUD · 18 项
bash scripts/test-m4-server.sh    # 评论 + 点赞 + 收藏 · 17 项
bash scripts/test-m5-server.sh    # 图片上传 · 8 项
bash scripts/test-m6-server.sh    # 管理后台 · 17 项
```

---

## 目录结构

```
your-blog/
├── client/                 # 前端 (Vite + React + TS)
│   └── src/
│       ├── api/            # http 客户端 + 各域 API 封装
│       ├── components/     # 共享 UI 组件
│       ├── hooks/          # useDebounce / useUrlParam / useSiteSettings
│       ├── layouts/        # PublicLayout / AdminLayout
│       ├── pages/          # 公共页 + admin/ 子目录
│       ├── stores/         # Zustand auth store
│       └── utils/          # cn / formatDate 等
├── server/                 # 后端 (Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma   # 9 张表
│   │   ├── migrations/     # Prisma migrations
│   │   └── seed*.ts        # 种子脚本
│   └── src/
│       ├── controllers/    # 薄控制器
│       ├── middlewares/    # auth / requireRole / validate / upload / error
│       ├── routes/         # Express 路由
│       ├── services/       # 业务层
│       └── utils/          # password / jwt / pagination / slug
├── mockups/                # 7 张高保真设计草稿
├── scripts/                # 端到端 e2e 脚本
├── docs/                   # REQUIREMENTS / ARCHITECTURE / DESIGN / DEV_PLAN
├── docker-compose.yml      # MySQL 8
├── CHANGELOG.md            # 主路线之外的增量
└── pnpm-workspace.yaml
```

---

## 路线图

| 阶段 | 内容 | 状态 |
|---|---|---|
| M0 | 工程脚手架 + DB | ✓ |
| M1 | 用户体系 + JWT + 角色守卫 | ✓ |
| M2 | 文章 CRUD | ✓ |
| M3 | 列表 / 搜索 / 分类标签 | ✓ |
| M4 | 评论 / 点赞 / 收藏 | ✓ |
| M5 | 图片上传 | ✓ |
| M6 | 管理后台 | ✓ |
| M7 | 部署准备(Dockerfile + nginx + env 分层) | ✓ |

详见 [docs/DEV_PLAN.md](docs/DEV_PLAN.md);M6 完成后的增量见 [CHANGELOG.md](CHANGELOG.md)。

---

## 文档索引

| 文档 | 内容 |
|---|---|
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | 需求清单与功能边界 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 技术架构 / 分层 / 数据模型 |
| [docs/DESIGN.md](docs/DESIGN.md) | UI 设计系统(Aurora AI · Klein Electric) |
| [docs/UI_DESIGN.md](docs/UI_DESIGN.md) | UI 规则与组件清单 |
| [docs/DEV_PLAN.md](docs/DEV_PLAN.md) | 8 个里程碑的开发计划 |
| [CHANGELOG.md](CHANGELOG.md) | 主路线之外的功能增量 |
| [mockups/](mockups/index.html) | 高保真设计草稿 |

---

## 许可证

[MIT](LICENSE) © 2026 maya1900
