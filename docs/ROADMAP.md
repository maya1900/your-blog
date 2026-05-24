# 后续路线 · post-M7

> M0–M7 主线见 [DEV_PLAN.md](DEV_PLAN.md)。本文档登记 post-M7 想到但还没做的事 —— 跟主线开发不一样,**不再按 milestone 编号串起来,而是按主题分组的 backlog**,挑着做。
> 已完成的 post-M7 增量见 [CHANGELOG.md](../CHANGELOG.md)。
> 版本:v1.0 · 2026-05-24

---

## 现状速览

| 已完成(post-M7) | commit |
|---|---|
| 单篇文章导出 Markdown | `8cd2f97` |
| 一键备份脚本 `scripts/backup.sh` | `d3dcd7c` |
| 修 prod / dev compose project name 冲突 | `82bf0fa` |
| 作者主页 `/users/:username` | `d0830bc` |

| 待办 · 短列表(写在文档里时的优先序) |
|---|
| **关注作者(C)** —— 配合作者主页是自然下一步 |
| **整站导出**(admin 一键 dump posts.json + uploads.tar.gz) |
| **HTTPS / SEO 基础**(sitemap.xml + RSS + OG 标签) |
| **ESLint + Prettier + Husky**(M0 / M7 都推迟了两次) |

工作量标记:【S】≈ 0.5–1h · 【M】≈ 半天 · 【L】≈ 1+ 天

---

## 1. 社交 / 互动深化

### 1.1 关注作者(C 功能)·【M】

> 详情页右栏「作者卡」之前留过 `M6 将在这里加入「关注 / 查看作者所有文章」` 的占位字幕,「查看所有文章」已经在 `d0830bc` 兑现,**关注还欠**。

数据模型:
```prisma
model Follow {
  followerId  Int
  followingId Int
  createdAt   DateTime @default(now())
  follower    User @relation("UserFollowing", fields: [followerId],  references: [id], onDelete: Cascade)
  following   User @relation("UserFollowers", fields: [followingId], references: [id], onDelete: Cascade)
  @@id([followerId, followingId])
  @@index([followingId])  // 反向查"我有多少粉丝"
}
```

后端接口:
- `POST   /api/users/:username/follow`   关注 · idempotent
- `DELETE /api/users/:username/follow`   取消关注
- `GET    /api/users/me/following`       我关注的人(分页)
- `GET    /api/users/me/followers`       我的粉丝(分页)
- `GET    /api/users/:username` 扩展返回 `followersCount / followingCount / followedByMe`

UI:
- 作者主页 (`/users/:username`) 顶部 stat 卡片加「粉丝 / 关注」+ 「关注」按钮(乐观更新)
- 详情页右栏作者卡底部加 follow 按钮
- `/me` 增加「关注」/「粉丝」两个 tab(或者独立 `/me/follows` 页)

延伸(独立做):
- **Following Feed** ·【M】 ·「/me?tab=following-feed」或者首页加一个 toggle,只看关注作者的最新文章
- **关注事件通知** ·【L】 · 走系统内 Notification 表(本期一并设计才划算)

---

### 1.2 评论 @ 提及 + 邮件通知 ·【L】

`@username` 在评论里自动 link 到作者页,并触发邮件/站内通知。需要:

- 评论 service 解析 `@xxx` 提取用户名
- 新 `Notification` 表(type / actorId / userId / articleId / commentId / readAt)
- SMTP 配置(`nodemailer` + .env 接收 SMTP_HOST / USER / PASS)
- `/me` 增加通知 tab + 红点提醒

**判断**:邮件链路有大坑(SMTP 服务商,反垃圾,deliverability),没真实用户前先不做。

---

## 2. 数据所有权 / 备份

### 2.1 整站导出(admin)·【M】

`POST /api/admin/export` → 流式产 zip,含:
- `posts.json` —— 所有文章的结构化 dump(含 author/category/tags)
- `comments.json`
- `users.json`(脱敏:不含 passwordHash,选择性含 email)
- `uploads.tar.gz` —— 上传的图片
- `manifest.json` —— 导出版本 / 时间 / 总数

前端 `/admin/export` 页面一个按钮,长任务可考虑后台 job 队列(本期同步即可,1MB JSON / 几十 MB 图片范围内同步打 zip 没问题)。

**这个比 `scripts/backup.sh` 高一层** —— 后者是 SQL dump,这个是结构化数据,跨平台迁移友好。

---

### 2.2 WXR 兼容导入 ·【L】

让 WordPress 来的人能一键吃进 WXR 文件。坑:
- WXR 是 XML,content 是 HTML(不是 Markdown),需要 `turndown` 之类转 Markdown
- 分类/标签 slug 在 WP 是 nicename,要做映射
- 媒体引用(`wp-content/uploads/...`)需要重写
- 作者映射(创建临时用户 or 全归到导入者)

工作量大头在「质量」而不是「能跑」。延后到真有需要时再做。

---

### 2.3 自动备份 cron ·【S】

prod compose 加一个 sidecar 容器,每天凌晨跑 `scripts/backup.sh`:

```yaml
backup:
  image: alpine:3
  restart: unless-stopped
  depends_on: [mysql, server]
  volumes:
    - .:/work:ro
    - ./backups:/backups
    - /var/run/docker.sock:/var/run/docker.sock  # 注意安全风险
  command: >
    sh -c "apk add docker-cli bash &&
           echo '0 3 * * * cd /work && bash scripts/backup.sh' | crontab - &&
           crond -f"
```

⚠ 挂 docker.sock 进容器 = 等同于 host root,可接受但要意识到。或者把 cron 写在宿主机的 crontab 更干净。

延伸:加 `RCLONE_REMOTE` env,备份后 `rclone copy` 到 S3 / B2 / Google Drive。

---

## 3. 工程质量

### 3.1 ESLint + Prettier + Husky ·【S】

M0 决定推迟,M7 又推迟。**装上 + 跑一次 fix 后人工 review 一遍** ≈ 1 小时。

- 根 `eslint.config.js`(flat config),client/server 各一套 override
- `prettier` 配置走 `printWidth: 100 + singleQuote + trailingComma: 'all'`(对齐现有 lvgr)
- `lint-staged` 让 pre-commit 只 lint 改动文件
- husky 配 pre-commit 跑 `lint-staged` + `tsc --noEmit`

---

### 3.2 单测 / e2e ·【M】

现在只有 server e2e(`scripts/test-m*.sh`,curl 风格)。前端 0 测。

最小可工作集:
- **Vitest + React Testing Library** —— 覆盖 `utils/` + 几个核心 hook(`useDebounce` / `useUrlParam`),约 20 条断言
- **Playwright** —— 1 个 happy path:注册 → 登录 → 写 → 发布 → 评论 → 退出。带视觉回归 baseline

判断:博客系统已经很稳了,改动也少,投入产出比偏低。**等真正想做大改造之前再补**。

---

## 4. 生产化深化

### 4.1 HTTPS / 域名 ·【S】

当前 nginx 只 listen 80。两条路:
- **Certbot in compose** —— 加一个 `certbot/certbot` 一次性容器跑 standalone 模式签证书,nginx 加 listen 443 + ssl_certificate 配置 + 80 → 443 redirect。证书续期写 cron
- **换成 Caddy** —— 自动 HTTPS、配置文件比 nginx 短得多。代价是少一些 nginx 的稳定性印象(实际上 Caddy 也很稳)

我更倾向 **Caddy 替代 nginx**,因为单机部署场景下 nginx 的复杂度溢出。但这是 prod 架构调整,有 image 一致性问题(`Dockerfile.client` 要重写),实际可以延后等真上线再决定。

---

### 4.2 SEO 基础 ·【M】

- `GET /sitemap.xml` —— 走 server,列所有 published article 的 `/articles/<slug>` + 主页 + 分类 + 标签
- 详情页 / 首页 / 作者页 / 分类页注入 OG / Twitter Card meta(`react-helmet-async` 已在 deps,接进来即可)
- `<title>` / `<meta description>` 按文章动态(站点信息 + 文章标题)
- `robots.txt`

---

### 4.3 RSS ·【S】

`GET /rss.xml` —— 全站最新 20 篇 published article,标准 RSS 2.0 格式。文章 content 用摘要 + 详情链接,不全文输出(避免站外阅读完全替代站内)。

---

### 4.4 监控 ·【M】

- 错误上报:`@sentry/node` + `@sentry/react`
- 访问日志:pino 已经在用,加一个 transport 推到 file / loki / cloudwatch
- 健康监控:`/api/health` 已经有,接个 Uptime Robot 或自己跑 Grafana

**判断**:真有用户之后再做。本期博客是给自己用的,出问题自己看 docker logs 就行。

---

## 5. UX 打磨

| 项 | 工作量 | 描述 |
|---|---|---|
| 草稿自动保存 | 【M】 | Write 页 30 秒 debounce 自动 PATCH 当前草稿,顶部加「自动保存于 …」时间戳 |
| 图片上传后端压缩 | 【S】 | `sharp` 装一下,multer 处理完后压缩 + 转 WebP,降低 80% 流量 |
| 代码块复制按钮 | 【S】 | MarkdownRenderer 给 `<pre>` 加 hover-only 的 copy 按钮,navigator.clipboard 写入 |
| 暗色模式 | 【L】 | Tailwind `class` 策略,定义 `dark:` 变量;现有所有页面 hand-tune dark palette;`localStorage` 持久化 |
| 全文搜索 | 【L】 | 现在只搜标题。要扩到正文 + 摘要,MySQL 加 fulltext index(中文需要 ngram parser),或者上 MeiliSearch / typesense |
| 评论 markdown / 表情 | 【M】 | 评论 textarea 换成 markdown editor,允许行内代码 + emoji |
| Reading Progress Bar | 【S】 | 详情页顶部一条进度条,跟 scroll 联动 |
| Outline ↔ 章节双向高亮 | 【M】 | TOC 当前章节高亮跟随 scroll;点 TOC 滚到对应章节 |

---

## 6. 决策记录(刻意不做)

| 不做项 | 原因 |
|---|---|
| 多语言 i18n | 中文博客,目标读者就是中文用户。多一层抽象增加维护成本 |
| 多用户协作(团队博客) | 单人博客定位,管理员只是为了删评论,不为分工写作 |
| GraphQL | REST + zod + Prisma 已经够用,GraphQL 增加 client 端 Apollo / urql 的复杂度但不解决任何当前问题 |
| Redis 缓存层 | MySQL 单库性能足够,引入 Redis 是 over-engineering;真有热点查询时再说 |
| 站内消息 / 私信 | 不是博客该有的功能,要做应该单独做一个 IM 项目 |
| AI 摘要 / AI 写作助手 | 故意保持「慢工出细活」的人写文化,AI 工具不进 UI |
| 付费墙 / 订阅 | 个人博客没必要 |

---

## 优先级建议(我的视角)

如果按「兑现度高 + 用户提到 + 工作量可控」排,接下来三个最值得做的:

1. **关注作者(1.1)** ·【M】 —— 兑现 M2 占位 TODO 的另一半,数据齐了只差表 + 接口 + UI
2. **ESLint + Prettier + Husky(3.1)** ·【S】 —— 已经推迟两次了,再不做就该改名叫「永远的 M7+1」
3. **SEO 基础(4.2)** ·【M】 —— 博客没 SEO 等于没人看;`react-helmet-async` 都装好了

「整站导出」「RSS」「HTTPS」是优先级稍低但都简单的事,可以穿插着做。其他延后。
