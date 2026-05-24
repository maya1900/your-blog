# Changelog

> M0–M7 主线里程碑及对应 commit 见 [docs/DEV_PLAN.md](docs/DEV_PLAN.md)。  
> 本文件记录主路线之外的增量功能、细节修复与重构,按时间倒序。

---

## 2026-05-24 · post-M7

### 一键备份脚本 · `scripts/backup.sh`

prod 栈快照打包成单个 tar:mysqldump(`--single-transaction` 一致性快照,流式 gzip 不落明文)+ uploads named volume 完整内容 + manifest,默认输出到 `backups/your-blog-<timestamp>.tar.gz`。配上 cron 就是完整的备份方案。

- 默认读 `.env.production`,可改 `ENV_FILE` / `BACKUP_DIR` / `MYSQL_CONTAINER` / `UPLOADS_VOLUME`
- 启动前先 fail-fast 检查 docker daemon / mysql 容器 / uploads 卷三个前置条件,缺一报错退出
- 跑临时 `alpine:3` 容器以只读挂载 volume 的方式 tar 出 uploads(不需要把 nginx/server 容器停)
- README「数据备份 / 恢复」章节附带完整的恢复步骤(解包 → mysql restore → uploads 卷清空重灌 → server 重启)
- `.gitignore` 加 `backups/`,避免误把备份提交进 git

### 单篇文章导出 Markdown · `8cd2f97`

`/me` 已发布 / 草稿列表每行新增「下载」icon,一键导出当前文章为 .md(YAML frontmatter + 正文原文)。所有权层面对齐 Hexo/Jekyll —— 你写的字随时能取走。

- **后端**:`GET /api/articles/:slug/export` —— 权限沿用 `getArticleBySlug`(草稿仅作者 / 管理员可见),但**不触发 viewCount 自增**(导出 ≠ 阅读)
- **frontmatter 字段**:`title / slug / status / publishedAt / createdAt / updatedAt / category / tags / excerpt / coverImage / author`
- YAML 转义走 `JSON.stringify`(JSON 字符串是合法 YAML 双引号 scalar,免引第三方 YAML 库)
- 响应头:`Content-Type: text/markdown; charset=utf-8` + `Content-Disposition: attachment; filename="<slug>.md"`(slug 由 `generateSlug` 保证 ASCII 安全)
- **前端**:`api/articles.downloadArticleMarkdown(slug)` —— axios `responseType: 'blob'`,从 `Content-Disposition` 头读文件名,off-screen anchor 触发原生下载
- 路由顺序:`GET /:slug/export` 放在 `/:slug` 前(纯顺序无关,但视觉分组)
- 验收:已发布文章匿名 200 + 完整 frontmatter;草稿匿名 404、admin 200

---

## 2026-05-24 · M7 部署准备

### Docker 三联生产部署

`docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build` 在干净机器上拉起 `mysql + server + nginx` 三个容器,server entrypoint 自动跑 `prisma migrate deploy`,nginx 直出 `/uploads`。

- **Dockerfile.server** — 多阶段:builder 阶段 pnpm 装全量 deps + `prisma generate` + `tsc`;runner 阶段 alpine + openssl + tini,搬 builder 的 `dist / prisma / node_modules`,HEALTHCHECK 走 `/api/health`
- **Dockerfile.client** — pnpm + vite build → nginx:1.27-alpine
- **nginx/nginx.conf** — `/api` 反代 `server:4000`;`/uploads` `alias` 走 `/var/www/uploads/`(named volume 只读挂载);静态 hash 资源 30 天 `Cache-Control: immutable`;`index.html` 不缓存;`client_max_body_size 6m` 略大于 server 的 5MB 上限
- **docker-compose.prod.yml** — depends_on healthcheck 串起启动顺序,mysql 不暴露端口,`blog-uploads` named volume 在 server(rw)+ nginx(ro) 之间共享
- **server/docker-entrypoint.sh** — 启动时 `node ./node_modules/prisma/build/index.js migrate deploy` → `exec node dist/index.js`,重启幂等
- **`.env.production.example` + `.dockerignore`** — 一份模板填好就能跑;dockerignore 排除 docs/mockups/scripts/test-*.sh + 所有 .env 文件

### 源码改造(最小化)

- **`app.listen` 绑 `0.0.0.0`** · [server/src/index.ts](server/src/index.ts) 原来不传 host 默认 localhost,容器内 nginx 访问不到
- **`UPLOAD_ROOT` 改 env 驱动** · [server/src/config/env.ts](server/src/config/env.ts) 新增 `UPLOAD_ROOT: z.string().default('uploads')`;[middlewares/upload.ts](server/src/middlewares/upload.ts) 删常量、destination 改读 env;[app.ts](server/src/app.ts) `express.static(env.UPLOAD_ROOT, ...)`;dev 默认值兼容旧行为
- **upload controller 用 `path.relative` 计算 URL** · [controllers/upload.controller.ts](server/src/controllers/upload.controller.ts) 之前是 `replace(/^uploads\//, '')`,UPLOAD_ROOT 变了就废;改成 `relative(env.UPLOAD_ROOT, req.file.path)`,绝对/相对路径都对

### README 增「生产部署」章节

部署架构表(三容器 + 两 volume) + 滚动升级 / 备份 / 清理 常用运维命令。

---

## 2026-05-24 · post-M6

### 站点信息可配置 · `1f00ca0`

把硬编码的「墨记」从代码里抽出,接进通用 KV 表 `SiteSetting`,后台可改、即时生效。

- **DB**:新增 `SiteSetting` 表(key / value / updatedAt),迁移 `20260524003027_add_site_setting`
- **后端**
  - `GET /api/site/settings`(公共) · `PUT /api/admin/site/settings`(admin):站点名 / 标语 / Logo URL / Favicon URL
  - `GET /api/site/about`(公共) · `PUT /api/admin/site/about`(admin):Markdown 内容 + `updatedAt`
  - Zod 校验:站点名 ≤32、标语 ≤200、关于页 ≤20000、Logo / Favicon 仅接受 `/uploads/…` 或 `http(s)://`
- **前端**
  - `useSiteSettings()` hook 全站缓存(`staleTime: Infinity`)+ 自动同步 `document.title` 和 `<link rel="icon">`
  - 5 处硬编码替换(顶导 logo / footer / 后台侧边栏 / 注册页 / 浏览器标签)
  - **`/about`** 公共页:Markdown 渲染 + 骨架加载 + "最后更新"时间戳
  - **`/admin/about`** 编辑页:MDEditor live-preview + dirty 检测 + 撤销 + "预览访客视图"
  - **`/admin/site`** 站点信息页:站点名 / 标语 输入框 + 实时字数计数;Logo / Favicon 两个 `ImageField`(点击 / 拖入上传,矩形 / 正方两形)
  - 公共顶导新增 `关于` NavLink(标签右侧)
  - 后台侧边栏新增 `SITE` 分组(站点信息 + 关于页)

### 用户管理大改 · `3aa748c`

后台用户管理从「只能切换角色 / 启用」扩展到完整编辑;新增自助改密 + 管理员重置密码两条路径。

- **后端**
  - `admin.service.UpdateUserSchema` 扩展:`username` / `email` / `bio` / `avatar` 全可改;username + email 查重撞了 → 409
  - `POST /api/users/me/password`:用户自助改密,必须验证当前密码;新密码 8-64 位、不能与当前相同
  - `POST /api/admin/users/:id/password`:管理员重置任意用户密码,无需当前密码
  - 自我保护两条不变:admin 不能改自己角色、不能禁用自己
- **前端**
  - `AvatarEditor` 抽成共享组件 `client/src/components/AvatarEditor.tsx`,新增 `size: 'sm' | 'md'`,Me 页面与 admin 编辑弹窗复用
  - `/admin/users` 行内 `编辑` 按钮 → 弹 `UserEditDialog`:头像 + 两栏(用户名 / 邮箱) + 简介 + 角色 + 启用;本人行角色 / 禁用按钮锁死
  - `UserEditDialog` 底部独立 `PasswordResetSection`(新密码 + 确认),与资料表单各自独立 mutation
  - `/me` 资料 tab 底部新增 `PasswordChangeCard`(当前 / 新 / 确认),实时校验三条:过短 / 与当前相同 / 两次不一致

### 个人资料编辑 · `550bf5e`

`/me` 资料 tab 从只读 dl 变成可编辑表单。

- **后端** `PATCH /api/users/me`:username + bio + avatar 三字段;email / role / isActive 锁死;username 改了才查重 → 409
- **前端**
  - 圆形 `AvatarEditor`:点击 / 拖入上传,hover 蒙层显示相机或转圈,可移除
  - 表单实时 dirty 检测,有改动才能保存;撤销按钮一键还原
  - 200 字 bio 计数(>180 转琥珀色)
  - onSuccess 直接 `setUser(updated)` 同步 auth store,顶部头像区立即刷新

### Fixes

- **顶部用户菜单 hover 消失** · `550bf5e`  
  头像和下拉框之间 8px `mt-2` 真空导致鼠标穿过时 group-hover 失效。改用 `pt-2`(padding)让间隙算入命中区,白色卡片移到内部 div。
