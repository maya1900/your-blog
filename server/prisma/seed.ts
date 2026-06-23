import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      nickname: 'admin',
      email: 'admin@moji.local',
      passwordHash,
      role: Role.ADMIN,
      bio: '平台管理员',
    },
  })

  // Pre-seed categories
  const categories = [
    { name: '前端', slug: 'frontend' },
    { name: '后端', slug: 'backend' },
    { name: '工具', slug: 'tools' },
    { name: '思考', slug: 'thoughts' },
  ]

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    })
  }

  // Default site settings — only inserted on first run; not overwritten on re-seed
  await prisma.siteSetting.upsert({
    where: { key: 'about' },
    update: {},
    create: {
      key: 'about',
      value: `# 关于墨记

墨记是一个用 React + Express + Prisma 写的小型博客系统。慢一点,但写完每一行都想清楚了。

## 博主

- **名字**:管理员
- **联系**:admin@moji.local
- **写作主题**:前端 / 后端 / 工具 / 思考

> 这段文字可以在管理后台 → 关于页 中随时修改。`,
    },
  })

  // eslint-disable-next-line no-console
  console.log('✓ Seeded')
  // eslint-disable-next-line no-console
  console.log(`  admin user → username: admin / password: admin123 (id ${admin.id})`)
  // eslint-disable-next-line no-console
  console.log(`  categories → ${categories.map((c) => c.name).join(' / ')}`)
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
