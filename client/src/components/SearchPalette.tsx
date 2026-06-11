import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Search, X } from 'lucide-react'
import { listArticles } from '@/api/articles'
import { useDebounce } from '@/hooks/useDebounce'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Full-screen search palette opened from the top-nav search icon.
 * - 300ms debounce
 * - Enter on any result → navigate to its detail page
 * - Enter with no result yet → navigate to /search?keyword=...
 * - Esc closes
 */
export function SearchPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const debounced = useDebounce(keyword, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => listArticles({ keyword: debounced, pageSize: 8 }),
    enabled: open && debounced.trim().length > 0,
    staleTime: 30 * 1000,
  })

  // Focus the input when palette opens, clear on close.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      setKeyword('')
    }
  }, [open])

  // Close on Escape (handled at container).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const items = data?.items ?? []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = keyword.trim()
    if (!q) return
    // If we already have a confident first result, jump to it.
    if (items.length > 0) {
      navigate(`/articles/${items[0]!.slug}`, { viewTransition: true })
    } else {
      navigate(`/search?keyword=${encodeURIComponent(q)}`, { viewTransition: true })
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-whisper rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 border-b border-whisper">
          <Search size={18} className="text-steel" />
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索文章标题…"
            className="flex-1 outline-none bg-transparent text-[15px]"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="btn-icon !w-7 !h-7"
              aria-label="清空"
            >
              <X size={14} />
            </button>
          )}
          <span className="font-mono text-[10px] text-steel border border-whisper rounded px-1.5 py-0.5">
            ESC
          </span>
        </form>

        <div className="max-h-[60vh] overflow-y-auto">
          {!debounced.trim() && (
            <div className="px-5 py-8 text-center text-steel text-sm">
              输入关键词搜索文章标题
            </div>
          )}

          {debounced.trim() && items.length === 0 && (
            <div className="px-5 py-8 text-center text-steel text-sm">
              没有找到 <span className="text-ink">"{debounced}"</span> 相关的文章
            </div>
          )}

          {items.length > 0 && (
            <ul>
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => {
                      navigate(`/articles/${a.slug}`, { viewTransition: true })
                      onClose()
                    }}
                    className="w-full text-left px-5 py-3 flex items-center gap-4 hover:bg-whisper-soft transition border-b border-whisper last:border-b-0 group"
                  >
                    <span className="font-mono text-xs text-steel tracking-[0.04em] uppercase shrink-0 w-12">
                      {a.category.name}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink line-clamp-1 group-hover:text-klein">
                        {a.title}
                      </p>
                      {a.summary && (
                        <p className="text-xs text-steel line-clamp-1 mt-0.5">{a.summary}</p>
                      )}
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-steel shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-klein"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-2.5 border-t border-whisper bg-whisper-soft/50 flex items-center justify-between font-mono text-[11px] text-steel">
          <span>仅搜文章标题</span>
          <span>{items.length > 0 ? `${items.length} 条结果 · ↵ 打开第一条` : '↵ 进入完整搜索'}</span>
        </div>
      </div>
    </div>
  )
}
