/**
 * Dev-only seed: create realistic articles for visual + e2e testing.
 * Idempotent — looks up existing slugs and updates content rather than
 * duplicating. Run via `pnpm db:seed-articles` (or directly: pnpm -C server tsx prisma/seed-articles.ts)
 */
import { PrismaClient, ArticleStatus } from '@prisma/client'

const prisma = new PrismaClient()

interface Seed {
  slugBase: string
  title: string
  summary: string
  content: string
  categorySlug: string
  tags: string[]
  coverUrl: string
}

const SEEDS: Seed[] = [
  {
    slugBase: 'tanstack-query-staletime',
    title: 'TanStack Query 缓存策略 — 从 staleTime 到失效设计',
    summary:
      '默认 staleTime: 0 不是 bug 是 feature。捋清楚 stale、gc、refetch 三个时间窗口怎么配,缓存就稳了。',
    coverUrl: 'https://picsum.photos/seed/staletime/1280/720',
    categorySlug: 'frontend',
    tags: ['React', 'TanStack', '缓存'],
    content: `## 为什么需要 staleTime

上周 review 一个组员的 PR,改的是个列表页接口请求。她把所有 query 都加了 \`refetchOnWindowFocus: false\`,理由是"切回标签页就刷数据太烦了"。

我看完没说话,只问了一句:那你 \`staleTime\` 怎么设的?她说没设过,默认就好。

这是 TanStack Query 用户里最常见的误解之一 — 把 **"何时认为数据过期"**(stale)和 **"何时重新拉数据"**(refetch)混为一谈。

## 默认值的陷阱

默认 \`staleTime: 0\` 的设计哲学是"数据一拿到就过期",所以任何重新挂载、窗口聚焦、网络重连都会触发 refetch。

\`\`\`ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 分钟内数据视为新鲜,不会触发 refetch
      staleTime: 5 * 60 * 1000,
      // 10 分钟没人订阅就 GC,腾出内存
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
})
\`\`\`

> 缓存最难的不是何时拉数据,而是何时**不要**拉数据。

## 实战策略

我习惯把场景分成四类:

1. **静态资源类**(分类列表、标签云):\`Infinity\`,手动失效
2. **低频变动类**(文章详情、用户资料):5 分钟
3. **实时性中等**(评论列表):30 秒
4. **实时性强**(在线状态):0 配合 \`refetchInterval\`
`,
  },
  {
    slugBase: 'vite-5-react-migration',
    title: '用 Vite 5 重构两年前的 React 项目踩到的几个坑',
    summary:
      'CRA 项目迁移到 Vite,看起来只要装个 plugin,实际上 PostCSS、SVG import、绝对路径全要重新捋。',
    coverUrl: 'https://picsum.photos/seed/vite5/1280/720',
    categorySlug: 'frontend',
    tags: ['React', 'Vite', '迁移'],
    content: `## 为什么换 Vite

CRA 已经几年没更新了,我们项目还跑在 \`react-scripts\` 5,体感就是慢:HMR 改一行 CSS 要 3 秒,启动要 15 秒。

## 第一个坑:SVG import

CRA 默认 \`import logo from "./logo.svg"\` 是 URL,而 Vite 也是。看起来一样,但 \`import { ReactComponent }\` 写法没了 — Vite 要用 \`?react\` 后缀:

\`\`\`ts
import LogoUrl from './logo.svg'                   // URL
import Logo from './logo.svg?react'                // React component
\`\`\`

## 第二个坑:绝对路径

\`tsconfig.json\` 里的 \`paths\` 配置只让 TS 编译器认识 \`@/\`,Vite 运行时不认。还要在 \`vite.config.ts\` 里写一遍 alias。

## 第三个坑:env 变量前缀

CRA 是 \`REACT_APP_*\`,Vite 是 \`VITE_*\`。所有 env 文件都得改。
`,
  },
  {
    slugBase: 'why-i-replaced-redux-with-context',
    title: '为什么我又把 Redux 换回了 Context',
    summary:
      '三个项目以后,我发现自己写的 Redux 80% 都是远程数据。该交给 TanStack Query 的事,不要让 store 背锅。',
    coverUrl: 'https://picsum.photos/seed/redux/1280/720',
    categorySlug: 'frontend',
    tags: ['React', '状态管理'],
    content: `## 一段心路历程

2020 写 Redux,2022 换 Zustand,2024 换 Context,2026 又想用 Redux。最后一次想用 Redux 的时候我停了下来 — 问自己:store 里到底放了什么?

## 大部分 store 其实是远程数据

仔细看你写的 reducer,有多少 action 其实是 \`fetch / fetchSuccess / fetchError\` 三件套?

\`\`\`ts
const { data, isLoading } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
})
\`\`\`

这些都该交给 TanStack Query。

## 剩下的才是真客户端状态

- 当前主题(深色/浅色)
- 侧边栏是否折叠
- 临时表单草稿

这些用 \`Context\` 或 Zustand 就够了,根本不需要 Redux 的 dispatcher / reducer / selector 三层抽象。

> 不是 Redux 不好,是大部分场景用不上。
`,
  },
  {
    slugBase: 'prisma-mysql-m2m',
    title: '我是怎么用 Prisma + MySQL 8 处理多对多的',
    summary:
      'implicit 与 explicit 多对多,选错了会写出一堆 join 重复字段。结合 schema 与查询场景一起决定。',
    coverUrl: 'https://picsum.photos/seed/prisma/1280/720',
    categorySlug: 'backend',
    tags: ['Prisma', 'MySQL', '数据建模'],
    content: `## implicit vs explicit

Prisma 的多对多关系有两种写法。

**Implicit**(隐式):

\`\`\`prisma
model Post {
  id   Int   @id @default(autoincrement())
  tags Tag[]
}
model Tag {
  id    Int    @id @default(autoincrement())
  posts Post[]
}
\`\`\`

Prisma 自动生成 \`_PostToTag\` 中间表,你看不见它。

**Explicit**(显式):

\`\`\`prisma
model Post {
  id   Int       @id @default(autoincrement())
  tags PostTag[]
}
model Tag {
  id    Int       @id @default(autoincrement())
  posts PostTag[]
}
model PostTag {
  postId Int
  tagId  Int
  post   Post @relation(fields: [postId], references: [id])
  tag    Tag  @relation(fields: [tagId], references: [id])
  @@id([postId, tagId])
}
\`\`\`

## 何时该用 explicit

中间表本身需要承载字段时(比如打标签的时间、谁打的标签、置顶状态),就必须 explicit。

否则 implicit 更简洁。我们博客的 \`ArticleTag\` 是 explicit,因为后续可能加置顶标签或时间排序。
`,
  },
  {
    slugBase: 'react-19-hooks',
    title: 'React 19 的新 hook 真的有用吗',
    summary:
      'useOptimistic 看起来很美好,真用起来会发现:你以为它给你减压,实际上它让你想清楚一切边界。',
    coverUrl: 'https://picsum.photos/seed/react19/1280/720',
    categorySlug: 'thoughts',
    tags: ['React', '思考'],
    content: `## useOptimistic 第一印象

文档示例看上去丝滑得不行 — 一个 \`useOptimistic\` 包一下,点击按钮立刻更新 UI,后端慢一点也没人觉察。

## 真用起来

错误处理是关键问题。乐观更新失败了怎么回滚?Toast 提示用户?还是悄悄重试?这些 React 不替你做决定。

所以 \`useOptimistic\` 不是减压,是逼你想清楚:

- 失败回滚 UI 时,中间用户的二次操作怎么 merge?
- 多个乐观更新同时 in-flight,顺序怎么保证?
- 后端最终返回的状态和 UI 推测的不一致怎么 reconcile?

## 结论

适合"低损失"场景:点赞、标签切换、Notion 风格的字段编辑。
不适合"高损失"场景:支付、发布、删除。
`,
  },
]

async function main() {
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!adminUser) throw new Error('Run `pnpm db:seed` first to create admin user')

  for (const seed of SEEDS) {
    const category = await prisma.category.findUnique({ where: { slug: seed.categorySlug } })
    if (!category) {
      console.warn(`✗ category ${seed.categorySlug} not found, skipping`)
      continue
    }

    // Upsert tags
    const tagRecords = await Promise.all(
      seed.tags.map((name) =>
        prisma.tag.upsert({ where: { name }, create: { name }, update: {} }),
      ),
    )

    // Find by slug or create
    const existing = await prisma.article.findUnique({ where: { slug: seed.slugBase } })
    if (existing) {
      await prisma.article.update({
        where: { id: existing.id },
        data: {
          title: seed.title,
          summary: seed.summary,
          content: seed.content,
          coverUrl: seed.coverUrl,
          status: ArticleStatus.PUBLISHED,
          publishedAt: existing.publishedAt ?? new Date(),
        },
      })
      console.log(`  ↻ updated  ${seed.slugBase}  (id=${existing.id})`)
    } else {
      const created = await prisma.article.create({
        data: {
          title: seed.title,
          slug: seed.slugBase,
          summary: seed.summary,
          content: seed.content,
          coverUrl: seed.coverUrl,
          status: ArticleStatus.PUBLISHED,
          publishedAt: new Date(),
          author: { connect: { id: adminUser.id } },
          category: { connect: { id: category.id } },
          tags: {
            create: tagRecords.map((t) => ({ tag: { connect: { id: t.id } } })),
          },
        },
      })
      console.log(`  + created  ${seed.slugBase}  (id=${created.id})`)
    }
  }

  // Also create one draft to test the drafts tab
  const draftSlug = 'draft-tailwind-v4-theme'
  const draftExists = await prisma.article.findUnique({ where: { slug: draftSlug } })
  if (!draftExists) {
    const category = await prisma.category.findUnique({ where: { slug: 'frontend' } })
    const draft = await prisma.article.create({
      data: {
        title: 'Tailwind v4 的 @theme 指令实战(草稿)',
        slug: draftSlug,
        summary: '告别 tailwind.config.js,所有 token 都进 CSS。',
        content: '# 还在写中\n\n这只是个草稿。',
        coverUrl: 'https://picsum.photos/seed/tw4/1280/720',
        status: ArticleStatus.DRAFT,
        author: { connect: { id: adminUser.id } },
        category: { connect: { id: category!.id } },
      },
    })
    console.log(`  + draft    ${draftSlug}  (id=${draft.id})`)
  } else {
    console.log(`  ↻ existed  ${draftSlug}  (id=${draftExists.id})`)
  }

  console.log('\n✓ Article seed done')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
