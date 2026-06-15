import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { BadRequestError } from '../utils/errors.js'

export const linkPreviewRouter: Router = Router()

const QuerySchema = z.object({
  url: z.string().url('链接格式不正确'),
})

const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i
const META_RE =
  /<meta\s+[^>]*(?:property|name)=["'](?:og:title|twitter:title|description)["'][^>]*content=["']([^"']+)["'][^>]*>/gi

function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTitle(html: string) {
  const metas = [...html.matchAll(META_RE)]
  const metaTitle = metas.map((match) => cleanText(match[1] ?? '')).find(Boolean)
  if (metaTitle) return metaTitle

  const title = html.match(TITLE_RE)?.[1]
  return title ? cleanText(title) : ''
}

const preview: RequestHandler = async (req, res, next) => {
  try {
    const parsedQuery = QuerySchema.safeParse(req.query)
    if (!parsedQuery.success) throw new BadRequestError('链接格式不正确')

    const target = new URL(parsedQuery.data.url)
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      throw new BadRequestError('只支持 http/https 链接')
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3500)

    try {
      const response = await fetch(target.href, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'Mozilla/5.0 (compatible; MojiLinkPreview/1.0)',
        },
      })

      const contentType = response.headers.get('content-type') ?? ''
      const html = contentType.includes('text/html') ? await response.text() : ''
      const title = html ? extractTitle(html) : ''

      res.json({
        data: {
          url: response.url || target.href,
          title: title || target.hostname.replace(/^www\./, ''),
          domain: new URL(response.url || target.href).hostname.replace(/^www\./, ''),
        },
      })
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    next(err)
  }
}

linkPreviewRouter.get('/link-preview', preview)
