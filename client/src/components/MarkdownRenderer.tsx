import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Github,
  Info,
  Lightbulb,
  LockKeyhole,
  Play,
} from 'lucide-react'
import { replaceEmojiShortcodes } from '@/utils/emoji'
import { slugifyHeading, textFromReactNode } from '@/utils/headingId'

// Allow `className` on `<code>` so rehype-highlight can color tokens.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className']],
    span: [...(defaultSchema.attributes?.span ?? []), ['className']],
    mark: [],
    kbd: [],
    sub: [],
    sup: [],
    iframe: [
      ['src'],
      ['title'],
      ['allow'],
      ['allowFullScreen'],
      ['loading'],
      ['referrerPolicy'],
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'mark',
    'kbd',
    'sub',
    'sup',
  ],
}

interface Props {
  children: string
  className?: string
  canViewReplyOnly?: boolean
}

type DisclosureKind = 'details' | 'spoiler'
type CalloutKind = 'note' | 'tip' | 'warning'
type CustomBlockKind = DisclosureKind | CalloutKind | 'onebox' | 'reply'

type Segment =
  | { type: 'markdown'; content: string }
  | { type: 'custom-block'; kind: CustomBlockKind; title: string; content: string }

const customBlockOpenRe =
  /^\[(details|spoiler|hide|hidden|note|tip|warning|onebox|reply)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]$/i
const customBlockCloseRe = /^\[\/(details|spoiler|hide|hidden|note|tip|warning|onebox|reply)\]$/i

function normalizeKind(kind: string): CustomBlockKind {
  const normalized = kind.toLowerCase()
  if (normalized === 'hide' || normalized === 'hidden') return 'spoiler'
  if (normalized === 'note' || normalized === 'tip' || normalized === 'warning') return normalized
  if (normalized === 'onebox') return 'onebox'
  if (normalized === 'reply') return 'reply'
  return normalized === 'details' ? 'details' : 'spoiler'
}

function normalizeTitle(kind: CustomBlockKind, raw?: string) {
  const title = raw?.trim()
  if (title) return title
  if (kind === 'details') return '展开查看'
  if (kind === 'spoiler') return '隐藏内容'
  if (kind === 'tip') return '技巧'
  if (kind === 'warning') return '注意'
  if (kind === 'onebox') return ''
  if (kind === 'reply') return '回复后可见'
  return '提示'
}

function isCloseForKind(line: string, kind: CustomBlockKind) {
  const close = line.match(customBlockCloseRe)
  return close ? normalizeKind(close[1]!) === kind : false
}

function parseCustomBlocks(source: string): Segment[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const segments: Segment[] = []
  const buffer: string[] = []
  let inFence = false

  const flushMarkdown = () => {
    if (buffer.length === 0) return
    segments.push({ type: 'markdown', content: buffer.join('\n') })
    buffer.length = 0
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!
    const trimmed = line.trim()
    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence
      buffer.push(line)
      continue
    }
    const open = !inFence ? trimmed.match(customBlockOpenRe) : null
    if (!open) {
      buffer.push(line)
      continue
    }

    const kind = normalizeKind(open[1]!)
    const title = normalizeTitle(kind, open[2] ?? open[3] ?? open[4])
    const body: string[] = []
    let foundClose = false

    for (i += 1; i < lines.length; i += 1) {
      const next = lines[i]!
      const nextTrimmed = next.trim()
      if (/^(```|~~~)/.test(nextTrimmed)) {
        inFence = !inFence
        body.push(next)
        continue
      }
      if (!inFence && isCloseForKind(nextTrimmed, kind)) {
        foundClose = true
        break
      }
      body.push(next)
    }

    if (!foundClose) {
      buffer.push(line, ...body)
      break
    }

    flushMarkdown()
    segments.push({ type: 'custom-block', kind, title, content: body.join('\n') })
  }

  flushMarkdown()
  return segments
}

function DisclosureBlock({
  kind,
  title,
  children,
}: {
  kind: DisclosureKind
  title: string
  children: string
}) {
  if (kind === 'spoiler') {
    return <SpoilerBlock title={title}>{children}</SpoilerBlock>
  }

  return (
    <details className={`md-disclosure md-disclosure-${kind}`}>
      <summary className="md-disclosure-summary">
        <span className="md-disclosure-summary-title">{title}</span>
        <span className="md-disclosure-summary-hint">
          <ChevronDown size={14} />
        </span>
      </summary>
      <div className="md-disclosure-body">
        <MarkdownRenderer>{children}</MarkdownRenderer>
      </div>
    </details>
  )
}

function SpoilerBlock({ children }: { title: string; children: string }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <button
      type="button"
      className={`md-spoiler-text ${revealed ? 'is-revealed' : ''}`}
      aria-pressed={revealed}
      onClick={() => setRevealed((value) => !value)}
    >
      <MarkdownRenderer>{children}</MarkdownRenderer>
    </button>
  )
}

function CalloutBlock({
  kind,
  title,
  children,
}: {
  kind: CalloutKind
  title: string
  children: string
}) {
  const icon =
    kind === 'warning' ? (
      <AlertTriangle size={15} />
    ) : kind === 'tip' ? (
      <Lightbulb size={15} />
    ) : (
      <Info size={15} />
    )

  return (
    <aside className={`md-callout md-callout-${kind}`}>
      <div className="md-callout-title">
        <span className="md-callout-icon">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="md-callout-body">
        <MarkdownRenderer>{children}</MarkdownRenderer>
      </div>
    </aside>
  )
}

function findFirstUrl(source: string) {
  const match = source.match(/https?:\/\/[^\s<>"')\]]+/)
  if (!match) return null
  try {
    return new URL(match[0])
  } catch {
    return null
  }
}

function OneboxBlock({ title, children }: { title: string; children: string }) {
  const url = findFirstUrl(children)
  if (!url) return <MarkdownRenderer>{children}</MarkdownRenderer>

  const embed = getEmbedInfo(url)
  if (embed) {
    return (
      <div className="md-embed-card">
        <div className="md-embed-head">
          <span className="md-embed-icon">
            {embed.kind === 'github' ? <Github size={16} /> : <Play size={16} />}
          </span>
          <span>{title || embed.title}</span>
        </div>
        {embed.kind === 'github' ? (
          <a className="md-embed-link" href={url.href} target="_blank" rel="noreferrer">
            <span>{embed.title}</span>
            <small>{url.href}</small>
          </a>
        ) : (
          <iframe
            src={embed.src}
            title={title || embed.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>
    )
  }

  const host = url.hostname.replace(/^www\./, '')
  const label = title || host

  return (
    <a className="md-onebox" href={url.href} target="_blank" rel="noreferrer">
      <span className="md-onebox-domain">{host}</span>
      <span className="md-onebox-title">{label}</span>
      <span className="md-onebox-url">{url.href}</span>
      <span className="md-onebox-icon">
        <ExternalLink size={15} />
      </span>
    </a>
  )
}

function getEmbedInfo(url: URL):
  | { kind: 'youtube' | 'bilibili'; title: string; src: string }
  | { kind: 'github'; title: string }
  | null {
  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id ? { kind: 'youtube', title: 'YouTube', src: `https://www.youtube.com/embed/${id}` } : null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = url.searchParams.get('v')
    return id ? { kind: 'youtube', title: 'YouTube', src: `https://www.youtube.com/embed/${id}` } : null
  }

  if (host === 'bilibili.com' || host === 'm.bilibili.com') {
    const bvid = url.pathname.match(/\/video\/([^/?#]+)/)?.[1]
    return bvid
      ? {
          kind: 'bilibili',
          title: 'Bilibili',
          src: `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}`,
        }
      : null
  }

  if (host === 'github.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length >= 2) {
      return { kind: 'github', title: `${parts[0]}/${parts[1]}` }
    }
  }

  return null
}

function CustomBlock({ segment }: { segment: Extract<Segment, { type: 'custom-block' }> }) {
  if (segment.kind === 'details' || segment.kind === 'spoiler') {
    return (
      <DisclosureBlock kind={segment.kind} title={segment.title}>
        {segment.content}
      </DisclosureBlock>
    )
  }
  if (segment.kind === 'onebox') {
    return <OneboxBlock title={segment.title}>{segment.content}</OneboxBlock>
  }
  if (segment.kind === 'reply') {
    return null
  }
  return (
    <CalloutBlock kind={segment.kind} title={segment.title}>
      {segment.content}
    </CalloutBlock>
  )
}

function ReplyVisibleBlock({
  title,
  children,
  canView,
}: {
  title: string
  children: string
  canView?: boolean
}) {
  if (canView) {
    return (
      <div className="md-reply-visible">
        <p className="md-reply-visible-title">{title}</p>
        <MarkdownRenderer canViewReplyOnly={canView}>{children}</MarkdownRenderer>
      </div>
    )
  }

  return (
    <div className="md-reply-locked">
      <span className="md-reply-locked-icon">
        <LockKeyhole size={15} />
      </span>
      <div>
        <p>{title}</p>
        <small>回复本文后可查看隐藏内容</small>
      </div>
    </div>
  )
}

function CustomBlockWithContext({
  segment,
  canViewReplyOnly,
}: {
  segment: Extract<Segment, { type: 'custom-block' }>
  canViewReplyOnly?: boolean
}) {
  if (segment.kind === 'reply') {
    return (
      <ReplyVisibleBlock title={segment.title} canView={canViewReplyOnly}>
        {segment.content}
      </ReplyVisibleBlock>
    )
  }
  return <CustomBlock segment={segment} />
}

export function MarkdownRenderer({ children, className, canViewReplyOnly }: Props) {
  const segments = parseCustomBlocks(replaceEmojiShortcodes(children))
  return (
    <div className={`prose-article ${className ?? ''}`}>
      {segments.map((segment, idx) =>
        segment.type === 'markdown' ? (
          <ReactMarkdown
            key={`md-${idx}`}
            remarkPlugins={[remarkGfm]}
            // rehype-sanitize MUST run after rehype-highlight, so highlight's
            // class names survive sanitization (we allow `className` above).
            rehypePlugins={[rehypeRaw, rehypeHighlight, [rehypeSanitize, schema]]}
            components={{
              h1: ({ children: headingChildren }) => (
                <h1 id={slugifyHeading(textFromReactNode(headingChildren))}>
                  {headingChildren}
                </h1>
              ),
              h2: ({ children: headingChildren }) => (
                <h2 id={slugifyHeading(textFromReactNode(headingChildren))}>
                  {headingChildren}
                </h2>
              ),
              a: ({ href, children: linkChildren }) => (
                <a href={href} target="_blank" rel="noreferrer">
                  {linkChildren}
                </a>
              ),
            }}
          >
            {segment.content}
          </ReactMarkdown>
        ) : (
          <CustomBlockWithContext
            key={`cb-${idx}`}
            segment={segment}
            canViewReplyOnly={canViewReplyOnly}
          />
        ),
      )}
    </div>
  )
}
