import { Router, type RequestHandler } from 'express'
import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { z } from 'zod'
import { BadRequestError } from '../utils/errors.js'
import { requireAuth } from '../middlewares/requireAuth.js'

export const linkPreviewRouter: Router = Router()

const QuerySchema = z.object({
  url: z.string().url('链接格式不正确'),
})

const MAX_REDIRECTS = 3
const MAX_HTML_BYTES = 64 * 1024
const FETCH_TIMEOUT_MS = 3500
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

function isPrivateIp(address: string) {
  if (address.startsWith('::ffff:')) {
    return isPrivateIp(address.slice('::ffff:'.length))
  }
  const kind = isIP(address)
  if (kind === 4) {
    const parts = address.split('.').map(Number)
    const [a, b] = parts
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    )
  }
  if (kind === 6) {
    const normalized = address.toLowerCase()
    return (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:') ||
      normalized.startsWith('ff')
    )
  }
  return false
}

async function assertPublicHttpUrl(url: URL) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestError('只支持 http/https 链接')
  }
  if (!url.hostname || url.username || url.password) {
    throw new BadRequestError('链接格式不正确')
  }
  const ipKind = isIP(url.hostname)
  if (ipKind && isPrivateIp(url.hostname)) {
    throw new BadRequestError('不支持内网或本机地址')
  }

  let records: { address: string; family: number }[]
  try {
    records = await lookup(url.hostname, { all: true, verbatim: true })
  } catch {
    throw new BadRequestError('无法解析链接域名')
  }
  if (records.length === 0 || records.some((record) => isPrivateIp(record.address))) {
    throw new BadRequestError('不支持内网或本机地址')
  }
}

function resolveRedirect(from: URL, location: string | null): URL | null {
  if (!location) return null
  try {
    return new URL(location, from)
  } catch {
    return null
  }
}

async function readLimitedText(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) return ''

  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > MAX_HTML_BYTES) {
      await reader.cancel()
      throw new BadRequestError('页面过大，无法生成预览')
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function fetchPreviewTarget(initialUrl: URL, signal: AbortSignal) {
  let target = initialUrl
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertPublicHttpUrl(target)
    const response = await fetch(target.href, {
      redirect: 'manual',
      signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'Mozilla/5.0 (compatible; MojiLinkPreview/1.0)',
      },
    })

    if (response.status >= 300 && response.status < 400) {
      const next = resolveRedirect(target, response.headers.get('location'))
      if (!next) throw new BadRequestError('无效的跳转地址')
      target = next
      continue
    }

    return { response, finalUrl: target }
  }
  throw new BadRequestError('跳转次数过多')
}

const preview: RequestHandler = async (req, res, next) => {
  try {
    const parsedQuery = QuerySchema.safeParse(req.query)
    if (!parsedQuery.success) throw new BadRequestError('链接格式不正确')

    const target = new URL(parsedQuery.data.url)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const { response, finalUrl } = await fetchPreviewTarget(target, controller.signal)

      const contentType = response.headers.get('content-type') ?? ''
      const contentLength = Number(response.headers.get('content-length') ?? '0')
      if (contentLength > MAX_HTML_BYTES) {
        throw new BadRequestError('页面过大，无法生成预览')
      }

      const html = contentType.includes('text/html') ? await readLimitedText(response) : ''
      const title = html ? extractTitle(html) : ''
      const responseUrl = response.url ? new URL(response.url) : finalUrl
      await assertPublicHttpUrl(responseUrl)

      res.json({
        data: {
          url: responseUrl.href,
          title: title || responseUrl.hostname.replace(/^www\./, ''),
          domain: responseUrl.hostname.replace(/^www\./, ''),
        },
      })
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    next(err)
  }
}

linkPreviewRouter.get('/link-preview', requireAuth, preview)
