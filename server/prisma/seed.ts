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
