# 墨记 · Slow Blog

个人博客系统 · React + Express + Prisma + MySQL。

## 设计 / 需求 / 计划

| 文档 | 内容 |
|---|---|
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | 需求清单与功能边界 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 技术架构 / 分层 / 数据模型 |
| [docs/DESIGN.md](docs/DESIGN.md) | UI 设计系统(Aurora AI · Klein Electric) |
| [docs/DEV_PLAN.md](docs/DEV_PLAN.md) | 8 个里程碑的开发计划 |
| [mockups/](mockups/index.html) | 7 张高保真静态 HTML 设计草稿 |

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 · TypeScript · Vite · Tailwind CSS 3.4 |
| 后端 | Node 20 · Express · TypeScript · Prisma |
| DB | MySQL 8(本地用 Docker compose 起) |
| 认证 | JWT (HS256) + bcrypt |
| 编辑器 | @uiw/react-md-editor |
| 包管理 | pnpm workspaces |

## 开发环境要求

| 工具 | 版本 |
|---|---|
| Node | ≥ 20 |
| pnpm | ≥ 9 |
| Docker | 任意现代版本(用于跑 MySQL) |
| Git | 任意 |

## 初次启动

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量(默认值匹配 docker-compose 中的 MySQL)
cp .env.example .env

# 3. 启动 MySQL
pnpm db:up

# 4. 等待 MySQL 健康(约 15-30s),然后跑 Prisma 迁移
pnpm db:migrate

# 5. 同时启动前后端
pnpm dev
```

打开:
- 前端 → http://localhost:5173
- 后端 → http://localhost:4000/api/health

## 常用脚本

```bash
pnpm dev          # 同时启动 client + server (热重载)
pnpm build        # 构建 client + server
pnpm typecheck    # 全仓库 TypeScript 类型检查
pnpm lint         # 全仓库 lint

pnpm db:up        # 启动 MySQL 容器
pnpm db:down      # 停止 MySQL 容器(数据保留)
pnpm db:migrate   # 创建并应用迁移
pnpm db:studio    # 打开 Prisma Studio (浏览数据)
pnpm db:reset     # ⚠️ 重置数据库 + 重跑迁移
```

## 目录结构

```
your-blog/
├── client/                 # 前端 (Vite + React + TS)
├── server/                 # 后端 (Express + Prisma)
├── mockups/                # 设计草稿(浏览器直接打开)
├── docker-compose.yml      # MySQL 8
├── *.md                    # 设计 / 架构 / 需求文档
└── pnpm-workspace.yaml
```

## 当前进度

参见 [docs/DEV_PLAN.md](docs/DEV_PLAN.md) 末尾。
