import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { Info } from 'lucide-react'
import { getAbout } from '@/api/site'
import { formatDate } from '@/utils/format'

const MarkdownRenderer = lazy(() =>
  import('@/components/MarkdownRenderer').then((module) => ({
    default: module.MarkdownRenderer,
  })),
)

function AboutContentFallback() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-56 bg-whisper-soft rounded" />
      <div className="h-4 w-full bg-whisper-soft rounded" />
      <div className="h-4 w-5/6 bg-whisper-soft rounded" />
      <div className="h-4 w-4/6 bg-whisper-soft rounded" />
    </div>
  )
}

export function AboutPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['site', 'about'],
    queryFn: getAbout,
    staleTime: 60_000,
  })

  return (
    <div className="max-w-[760px] mx-auto px-6 md:px-10 py-16">
      <p className="font-mono text-xs text-steel tracking-[0.08em] inline-flex items-center gap-2 mb-6">
        <Info size={13} />
        ABOUT
      </p>

      {isLoading ? (
        <AboutContentFallback />
      ) : (
        <>
          <Suspense fallback={<AboutContentFallback />}>
            <MarkdownRenderer>{data?.content ?? ''}</MarkdownRenderer>
          </Suspense>
          {data?.updatedAt && (
            <p className="mt-12 pt-6 border-t border-whisper font-mono text-xs text-steel">
              最后更新 · {formatDate(data.updatedAt)}
            </p>
          )}
        </>
      )}
    </div>
  )
}
