import type { ArticleStatus } from '@/types/api'

interface Props {
  status: ArticleStatus
}

export function StatusBadge({ status }: Props) {
  if (status === 'PUBLISHED') {
    return (
      <span className="inline-flex items-center h-[22px] px-2 rounded-chip bg-emerald-50 text-emerald-700 text-xs font-medium tracking-[0.04em]">
        PUBLISHED
      </span>
    )
  }
  return (
    <span className="inline-flex items-center h-[22px] px-2 rounded-chip bg-amber-50 text-amber-700 text-xs font-medium tracking-[0.04em]">
      DRAFT
    </span>
  )
}
