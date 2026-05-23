import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Props {
  page: number
  pageCount: number
  onChange: (page: number) => void
  /** Show "X / Y" mono label and prev/next text */
  compact?: boolean
}

/**
 * Numeric pagination. Renders prev / next chevrons + a smart window of pages
 * (always shows first, last, current ± 1, with ellipses).
 */
export function Pagination({ page, pageCount, onChange, compact }: Props) {
  if (pageCount <= 1) return null

  const pages = buildPageWindow(page, pageCount)

  if (compact) {
    return (
      <nav className="flex items-center justify-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="text-steel hover:text-klein text-sm inline-flex items-center gap-1.5 disabled:opacity-30 disabled:hover:text-steel"
        >
          <ChevronLeft size={14} />
          上一页
        </button>
        <span className="font-mono text-xs text-steel mx-3">
          <span className="text-ink font-medium">{page}</span>
          <span className="mx-1.5 text-whisper">/</span>
          <span>{pageCount}</span>
        </span>
        <button
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className="text-ink hover:text-klein text-sm inline-flex items-center gap-1.5 disabled:opacity-30 disabled:hover:text-steel"
        >
          下一页
          <ChevronRight size={14} />
        </button>
      </nav>
    )
  }

  return (
    <nav className="flex items-center justify-center gap-1">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="btn-icon disabled:opacity-30"
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="text-steel text-sm px-1.5">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              'btn-icon font-mono text-xs',
              p === page && '!bg-klein !text-white hover:!bg-klein-deep',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className="btn-icon disabled:opacity-30"
      >
        <ChevronRight size={14} />
      </button>
    </nav>
  )
}

function buildPageWindow(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const out: (number | '…')[] = [1]
  if (page > 3) out.push('…')

  const start = Math.max(2, page - 1)
  const end = Math.min(total - 1, page + 1)
  for (let p = start; p <= end; p++) out.push(p)

  if (page < total - 2) out.push('…')
  out.push(total)
  return out
}
