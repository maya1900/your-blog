# Changelog

> M0–M7 主线里程碑及对应 commit 见 [docs/DEV_PLAN.md](docs/DEV_PLAN.md)。  
> 本文件记录主路线之外的增量功能、细节修复与重构,按时间倒序。

---

## 2026-05-24 · post-M7

### 封面图:随机封面 + 默认渐变 + 本地化压缩 + 引用计数式清理

写文章选封面之前只能上传或粘外链;现在多两个随机源 + 一张默认渐变兜底,本地化保存全部走 sharp 压缩裁剪,孤儿文件自动回收。

- **服务端**
  - `server/src/services/cover.service.ts` 新文件 —— sharp `rotate() → resize(1600, 900, fit:cover, position:attention) → jpeg(quality:82, mozjpeg)` 处理任何来源的封面;Picsum 拉随机 seed,Unsplash 走 `/photos/random?orientation=landscape` 并按规范 fire-and-forget `download_location` ping;下载有 10s 超时、12MB 上限、域名白名单(picsum.photos / fastly.picsum.photos / images.unsplash.com)防 SSRF
  - `tryDeleteCoverFile(url)` —— 引用计数式安全清理:URL 必须 `/uploads/` 前缀、resolve 后仍在 UPLOAD_ROOT 下(防 `..` 穿越)、不被任何 `article.coverUrl` 引用,三道闸过了才 unlink
  - `server/src/middlewares/upload-cover.ts` —— 内存版 multer(不落盘),让 sharp 直接处理 buffer 后再写 JPG
  - `POST /api/upload/cover`(单文件直传) / `POST /api/upload/cover/random`(`{source, query?}`) / `DELETE /api/upload/cover`(`{url}`) —— 三个新端点,**`/api/upload/image` 不动**(头像、文内插图、站点 logo 仍走原路径,不该被强制 16:9)
  - `updateArticle` / `deleteArticle` 在写入 DB 后调 `tryDeleteCoverFileSafe(oldCover)` —— 改封面、清封面、删文章三种链路全自动回收旧文件,引用守卫保证多文章共享同一封面时只有最后一个解引用的才删
  - `env.UNSPLASH_ACCESS_KEY` —— 可选,不配则 Unsplash 按钮报 400「未配置 Unsplash」
  - **顺手修了一个 M2 以来的旧 bug**:`coverUrl` 的 zod 校验是 `z.string().url()`,等于把 M5 加的本地上传通道直接堵死了(`/uploads/...` 不是合法 URL)。改成接受 `/` 开头或 `http(s)://` 的两种形态,和站点 logo/favicon 的 [`isOptionalUrl`](server/src/routes/site.routes.ts#L33-L37) 同款
- **前端**
  - [`components/CoverDropzone.tsx`](client/src/components/CoverDropzone.tsx) 重做 —— 直传切到 `/upload/cover`(自动 JPG 压缩 + 16:9 裁剪);右侧三个 pill 按钮 `🎲 Picsum / 🎲 Unsplash / 🔗 链接`;选中后若来源是随机,「删除」按钮前多一个「重抽」骰子按钮;追踪 `createdUrlsRef` —— 重抽 / 切源 / 改上传 / 改链接 / 点移除时都 fire DELETE 上一张,SPA 卸载走 axios DELETE,关页/刷新走 `fetch(keepalive:true)` 兜底;Unsplash 默认查询词从文章标题透传
  - [`components/DefaultCoverGradient.tsx`](client/src/components/DefaultCoverGradient.tsx) —— 纯 SVG 默认封面,djb2 哈希标题在 6 套预调和双色渐变里挑一套 + 装饰圆 + 斜线 + 半透明首字水印,**确定性渲染**(同标题 → 同图);零网络依赖,永不失效
  - [`ArticleList.tsx`](client/src/components/ArticleList.tsx) 把 "NO COVER" 占位换成渐变;[`ArticleDetail.tsx`](client/src/pages/ArticleDetail.tsx) 无封面时不再藏掉封面区,渲染渐变;两处保持视觉一致
  - `api/upload.ts` —— `uploadCover` / `uploadRandomCover` / `deleteCoverFile`(axios) / `deleteCoverFileKeepalive`(裸 fetch,unload 用)
- **依赖**:`sharp ^0.34`(macOS arm64 / linux x64 都有 prebuild,容器内会自动拉 musl 版本)

**遗留**:不展示 Unsplash 摄影师署名(图片已本地化,且只展示 attribution 会和首页排版冲突);只按 API 守则 ping `download_location` 做最低限度满足。

### HTTPS 反代(基础设施就绪,证书自备)

兑现 [ROADMAP 4.1](docs/ROADMAP.md) 一半 —— 仓库内把 nginx HTTPS 反代配齐,**证书签发流程刻意不绑死**(certbot / acme.sh / 付费 CA / 自签皆可),换 CA 时不用动 compose。

- **`nginx/nginx.https.conf`** — 80 全量 301 跳 443、TLS 1.2/1.3、HSTS 1 年、`/.well-known/acme-challenge/` 放行给 certbot --webroot 续期。证书路径硬编码 `/etc/nginx/certs/{fullchain,privkey}.pem`,文件缺失 nginx 启动直接 fail-fast(不是 bug)
- **`docker-compose.https.yml`** overlay — 追加 `${HTTPS_PORT:-443}:443` 端口、`./certs:/etc/nginx/certs:ro`、`./nginx/nginx.https.conf:/etc/nginx/conf.d/default.conf:ro` 覆盖 image 内 baked-in 的 HTTP 配置。**叠加** base prod compose 使用:`docker compose -f docker-compose.prod.yml -f docker-compose.https.yml up -d`
- **`.gitignore`** 加 `certs/` —— 防止误把私钥提交进 git
- **`.env.production.example`** 加 `HTTPS_PORT=443` + 提示「启用 HTTPS overlay 时 `CLIENT_ORIGIN` 必须改 https://...」(否则 CORS 出问题)
- **README** 新「HTTPS / TLS」小节,给三种签证书的菜谱(certbot standalone / 已有证书 / certbot --webroot 续期)

**刻意不做**:不内置 certbot sidecar 容器、不做 Caddy 替代。原因:博客系统证书一年签一次的事,搞个常驻容器收益低于复杂度;Caddy 替代是 prod 架构调整,等真上线踩坑再说。

### 作者主页 `/users/:username`

兑现 M2 写详情页时埋下的 TODO「查看作者所有文章」(代码里那条 `M6 将在这里加入…` 占位字幕)。「关注」功能本期不做,留给后续单独迭代。

- **后端** `GET /api/users/:username`(公开)—— 只返回 `{id, username, avatar, bio, createdAt, articleCount}`,绝不外漏 `email / role / isActive / passwordHash`;`articleCount` 用 `_count.articles` 加 `where: { status: 'PUBLISHED' }` 拿 publish 数;被 `isActive=false` 禁用的账号一律 404
- **前端**
  - `pages/AuthorProfile.tsx`:顶部头像 + 用户名 + bio + 加入时间 + 已发布数,下面接复用 `ArticleList` + 智能分页;骨架/404/空态都覆盖
  - 详情页右栏「作者卡」整张可点(头像和用户名),底部多一条「查看 X 的全部文章 →」link,替换之前那行 `M6 将在这里加入…` 字幕
  - `types/api.ts` 新增 `PublicUser` 类型(跟带敏感字段的 `User` 区分)

### Fixes

- **prod compose 与 dev 撞 project name** · prod 没设 `name:`,默认从目录名推断成 `your-blog`,跟 dev compose 同名共用一张 `your-blog_default` 网络。后果:对 prod 跑 `down -v` 会连带把 dev 容器从网络里拽下来一起删(named volume 完好,数据没丢,但容器要重启)。修法:`docker-compose.prod.yml` 顶部加 `name: your-blog-prod` 显式钉死项目名,两边互不打扰

### 一键备份脚本 · `scripts/backup.sh` · `d3dcd7c`

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
