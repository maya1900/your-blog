import { Router, type RequestHandler } from 'express'
import { ArticleStatus } from '@prisma/client'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'

export const seoRouter: Router = Router()

const SITE_SETTING_KEYS = ['siteTitle', 'siteTagline'] as const

function absoluteUrl(pathname: string): string {
  return new URL(pathname, env.CLIENT_ORIGIN).toString()
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

async function readSiteSettings() {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: SITE_SETTING_KEYS as unknown as string[] } },
  })
  const byKey = new Map(rows.map((row) => [row.key, row.value]))
  return {
    siteTitle: byKey.get('siteTitle') ?? '墨记',
    siteTagline:
      byKey.get('siteTagline') ??
      '用 React + Express + Prisma 写的。慢一点,但写完每一行都想清楚了。',
  }
}

const sitemap: RequestHandler = async (_req, res, next) => {
  try {
    const [articles, categories, tags, authors] = await prisma.$transaction([
      prisma.article.findMany({
        where: { status: ArticleStatus.PUBLISHED },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.category.findMany({
        where: { articles: { some: { status: ArticleStatus.PUBLISHED } } },
        select: { slug: true },
        orderBy: { name: 'asc' },
      }),
      prisma.tag.findMany({
        where: { articles: { some: { article: { status: ArticleStatus.PUBLISHED } } } },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: { isActive: true, articles: { some: { status: ArticleStatus.PUBLISHED } } },
        select: { username: true, createdAt: true },
        orderBy: { username: 'asc' },
      }),
    ])

    const urls: { loc: string; lastmod?: Date; priority?: string }[] = [
      { loc: absoluteUrl('/'), priority: '1.0' },
      { loc: absoluteUrl('/categories'), priority: '0.6' },
      { loc: absoluteUrl('/tags'), priority: '0.6' },
      { loc: absoluteUrl('/about'), priority: '0.5' },
      ...categories.map((category) => ({
        loc: absoluteUrl(`/categories/${category.slug}`),
        priority: '0.7',
      })),
      ...tags.map((tag) => ({
        loc: absoluteUrl(`/tags/${encodeURIComponent(tag.name)}`),
        priority: '0.6',
      })),
      ...authors.map((author) => ({
        loc: absoluteUrl(`/users/${encodeURIComponent(author.username)}`),
        lastmod: author.createdAt,
        priority: '0.6',
      })),
      ...articles.map((article) => ({
        loc: absoluteUrl(`/articles/${article.slug}`),
        lastmod: article.updatedAt ?? article.publishedAt ?? undefined,
        priority: '0.8',
      })),
    ]

    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((url) => {
        const parts = [`  <url>`, `    <loc>${escapeXml(url.loc)}</loc>`]
        if (url.lastmod) parts.push(`    <lastmod>${url.lastmod.toISOString()}</lastmod>`)
        if (url.priority) parts.push(`    <priority>${url.priority}</priority>`)
        parts.push('  </url>')
        return parts.join('\n')
      }),
      '</urlset>',
      '',
    ].join('\n')

    res.type('application/xml').send(body)
  } catch (err) {
    next(err)
  }
}

const rss: RequestHandler = async (_req, res, next) => {
  try {
    const [settings, articles] = await Promise.all([
      readSiteSettings(),
      prisma.article.findMany({
        where: { status: ArticleStatus.PUBLISHED },
        select: {
          title: true,
          slug: true,
          summary: true,
          content: true,
          publishedAt: true,
          updatedAt: true,
          author: { select: { username: true, nickname: true } },
          category: { select: { name: true } },
          tags: { include: { tag: { select: { name: true } } } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      }),
    ])

    const channelLink = absoluteUrl('/')
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0">',
      '<channel>',
      `  <title>${escapeXml(settings.siteTitle)}</title>`,
      `  <link>${escapeXml(channelLink)}</link>`,
      `  <description>${escapeXml(settings.siteTagline)}</description>`,
      `  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
      ...articles.flatMap((article) => {
        const link = absoluteUrl(`/articles/${article.slug}`)
        const description = article.summary || article.content.slice(0, 180)
        return [
          '  <item>',
          `    <title>${escapeXml(article.title)}</title>`,
          `    <link>${escapeXml(link)}</link>`,
          `    <guid isPermaLink="true">${escapeXml(link)}</guid>`,
          `    <description>${escapeXml(description)}</description>`,
          `    <pubDate>${(article.publishedAt ?? article.updatedAt).toUTCString()}</pubDate>`,
          `    <author>${escapeXml(article.author.nickname || article.author.username)}</author>`,
          `    <category>${escapeXml(article.category.name)}</category>`,
          ...article.tags.map(({ tag }) => `    <category>${escapeXml(tag.name)}</category>`),
          '  </item>',
        ]
      }),
      '</channel>',
      '</rss>',
      '',
    ].join('\n')

    res.type('application/rss+xml').send(body)
  } catch (err) {
    next(err)
  }
}

const robots: RequestHandler = (_req, res) => {
  res
    .type('text/plain')
    .send(['User-agent: *', 'Allow: /', `Sitemap: ${absoluteUrl('/sitemap.xml')}`, ''].join('\n'))
}

seoRouter.get('/sitemap.xml', sitemap)
seoRouter.get('/rss.xml', rss)
seoRouter.get('/robots.txt', robots)
