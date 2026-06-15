import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export const PageViewSchema = z.object({
  visitorId: z
    .string()
    .trim()
    .min(8)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  path: z.string().trim().min(1).max(512),
  referrer: z.string().trim().max(512).nullable().optional(),
})

export type PageViewInput = z.infer<typeof PageViewSchema>

export async function trackPageView(
  input: PageViewInput,
  viewer?: { id: number },
  meta?: { userAgent?: string },
) {
  const cutoff = new Date(Date.now() - 10_000)
  const recentDuplicate = await prisma.pageView.findFirst({
    where: {
      visitorId: input.visitorId,
      path: input.path,
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  })

  if (recentDuplicate) return

  await prisma.pageView.create({
    data: {
      visitorId: input.visitorId,
      path: input.path,
      referrer: input.referrer || null,
      userAgent: meta?.userAgent?.slice(0, 512) || null,
      userId: viewer?.id ?? null,
    },
  })
}
