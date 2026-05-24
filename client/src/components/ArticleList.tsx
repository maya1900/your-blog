import { Link } from 'react-router-dom'
import { ArrowRight, Eye } from 'lucide-react'
import type { Article } from '@/types/api'
import { formatDate, estimateReadTime } from '@/utils/format'
import { StatusBadge } from './StatusBadge'
import { DefaultCoverGradient } from './DefaultCoverGradient'

interface Props {
  items: Article[]
  /** Whether to show row numbers like "01 / 12" */
  numbered?: boolean
  /** Override the denominator of the row number (e.g. total across pages) */
  total?: number
  /** Starting index for numbering on this page (e.g. 10 for page 2 of 10/page) */
  startIndex?: number
}

/**
 * Shared zigzag article list. Rows alternate image-left / image-right.
 * Used by Home, CategoryArchive, TagArchive, SearchResults.
 */
export function ArticleList({ items, numbered = true, total, startIndex = 0 }: Props) {
  const denominator = total ?? items.length
  return (
    <div className="space-y-0">
      {items.map((a, i) => {
        const idx = startIndex + i
        const imageRight = idx % 2 === 1
        return (
          <Link
            to={`/articles/${a.slug}`}
            key={a.id}
            className="group grid md:grid-cols-12 gap-6 md:gap-10 items-center py-8 border-b border-whisper last:border-b-0 transition"
          >
            <div
              className={`md:col-span-5 rounded-xl overflow-hidden border border-whisper bg-whisper-soft ${imageRight ? 'md:order-2' : ''}`}
            >
              {a.coverUrl ? (
                <img
                  src={a.coverUrl}
                  alt=""
                  className="w-full aspect-[16/9] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <DefaultCoverGradient
                  title={a.title}
                  className="w-full aspect-[16/9] transition-transform duration-500 group-hover:scale-[1.02]"
                />
              )}
            </div>

            <div className={`md:col-span-7 ${imageRight ? 'md:order-1' : ''}`}>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {numbered && (
                  <>
                    <span className="font-mono text-xs text-klein tracking-[0.04em]">
                      {String(idx + 1).padStart(2, '0')} / {String(denominator).padStart(2, '0')}
                    </span>
                    <span className="w-6 h-px bg-whisper" />
                  </>
                )}
                <span className="font-mono text-xs text-steel tracking-[0.04em] uppercase">
                  {a.category.name}
                </span>
                {a.status === 'DRAFT' && <StatusBadge status="DRAFT" />}
              </div>
              <h3 className="text-[clamp(1.25rem,2vw,1.625rem)] font-semibold leading-[1.25] tracking-[-0.015em] transition-colors group-hover:text-klein">
                {a.title}
              </h3>
              {a.summary && (
                <p className="mt-3 text-[0.9375rem] leading-[1.6] text-steel line-clamp-2 max-w-xl">
                  {a.summary}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {a.tags.slice(0, 3).map((t) => (
                  <span key={t.id} className="chip">
                    {t.name}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between max-w-xl">
                <div className="flex items-center gap-2 text-sm text-steel">
                  <div className="w-5 h-5 rounded-full ring-1 ring-whisper overflow-hidden bg-whisper-soft">
                    {a.author.avatar && (
                      <img src={a.author.avatar} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="text-[13px]">{a.author.username}</span>
                  <span className="text-whisper">·</span>
                  <span className="font-mono text-xs">
                    {estimateReadTime(a.content)} 分钟 · {formatDate(a.publishedAt ?? a.createdAt)}
                  </span>
                  {a.viewCount > 0 && (
                    <>
                      <span className="text-whisper">·</span>
                      <span className="font-mono text-xs inline-flex items-center gap-1">
                        <Eye size={12} />
                        {a.viewCount.toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                  <span className="hidden sm:inline">阅读</span>
                  <ArrowRight
                    size={15}
                    className="transition-transform duration-200 group-hover:translate-x-1.5"
                  />
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
