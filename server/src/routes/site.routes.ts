import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export const siteRouter: Router = Router()

const ABOUT_KEY = 'about'

const DEFAULT_ABOUT =
  '# 关于\n\n这是「墨记」博客。可在后台 → 关于页 修改这段内容。'

// ============ Settings (short text) ============

// Keep this list small — these are tiny labels rendered on every page.
const SETTING_KEYS = ['siteTitle', 'siteTagline', 'siteLogo', 'siteFavicon'] as const
type SettingKey = (typeof SETTING_KEYS)[number]

const SETTING_DEFAULTS: Record<SettingKey, string> = {
  siteTitle: '墨记',
  siteTagline: '用 React + Express + Prisma 写的。慢一点,但写完每一行都想清楚了。',
  siteLogo: '',
  siteFavicon: '',
}

const SETTING_LIMITS: Record<SettingKey, number> = {
  siteTitle: 32,
  siteTagline: 200,
  siteLogo: 512,
  siteFavicon: 512,
}

// Validation for URL-shaped settings (logo, favicon). Empty means "unset".
const isOptionalUrl = (v: string | undefined) =>
  v === undefined ||
  v === '' ||
  v.startsWith('/') ||
  /^https?:\/\//.test(v)

async function readAllSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: SETTING_KEYS as unknown as string[] } },
  })
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  const out = {} as Record<SettingKey, string>
  for (const k of SETTING_KEYS) {
    out[k] = byKey.get(k) ?? SETTING_DEFAULTS[k]
  }
  return out
}

/** GET /api/site/settings — public; small labels used by layouts */
const getSettings: RequestHandler = async (_req, res, next) => {
  try {
    const settings = await readAllSettings()
    res.json({ data: settings })
  } catch (err) {
    next(err)
  }
}

// ============ About (long markdown) ============

/** GET /api/site/about — public; returns markdown content + updatedAt */
const getAbout: RequestHandler = async (_req, res, next) => {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: ABOUT_KEY } })
    res.json({
      data: {
        content: row?.value ?? DEFAULT_ABOUT,
        updatedAt: row?.updatedAt ?? null,
      },
    })
  } catch (err) {
    next(err)
  }
}

siteRouter.get('/settings', getSettings)
siteRouter.get('/about', getAbout)

// ============ Admin write — exported for mounting under /api/admin/site ============

const AboutSchema = z.object({
  content: z
    .string()
    .min(1, '内容不能为空')
    .max(20_000, '内容过长(最多 20000 字符)'),
})

// Each key validated against its own per-field length cap.
const SettingsSchema = z
  .object({
    siteTitle: z
      .string()
      .trim()
      .min(1, '站点名不能为空')
      .max(SETTING_LIMITS.siteTitle, `站点名最多 ${SETTING_LIMITS.siteTitle} 字符`)
      .optional(),
    siteTagline: z
      .string()
      .max(SETTING_LIMITS.siteTagline, `标语最多 ${SETTING_LIMITS.siteTagline} 字符`)
      .optional(),
    siteLogo: z
      .string()
      .max(SETTING_LIMITS.siteLogo)
      .refine(isOptionalUrl, 'logo 必须是 http(s):// 链接或 /uploads/… 路径')
      .optional(),
    siteFavicon: z
      .string()
      .max(SETTING_LIMITS.siteFavicon)
      .refine(isOptionalUrl, 'favicon 必须是 http(s):// 链接或 /uploads/… 路径')
      .optional(),
  })
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    '未提供更新字段',
  )

export const adminSiteRouter: Router = Router()

const putAbout: RequestHandler = async (req, res, next) => {
  try {
    const { content } = AboutSchema.parse(req.body)
    const row = await prisma.siteSetting.upsert({
      where: { key: ABOUT_KEY },
      create: { key: ABOUT_KEY, value: content },
      update: { value: content },
    })
    res.json({ data: { content: row.value, updatedAt: row.updatedAt } })
  } catch (err) {
    next(err)
  }
}

const putSettings: RequestHandler = async (req, res, next) => {
  try {
    const input = SettingsSchema.parse(req.body)
    const entries = (Object.entries(input) as [SettingKey, string | undefined][])
      .filter(([, v]) => v !== undefined) as [SettingKey, string][]

    // Tiny batch — sequential upserts keep things simple and atomic enough at
    // this scale (≤ 2-3 keys). Switch to a transaction if this list grows.
    for (const [key, value] of entries) {
      await prisma.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    }
    const settings = await readAllSettings()
    res.json({ data: settings })
  } catch (err) {
    next(err)
  }
}

adminSiteRouter.put('/about', putAbout)
adminSiteRouter.put('/settings', putSettings)
