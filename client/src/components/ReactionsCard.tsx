import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Heart } from 'lucide-react'
import { toggleFavorite, toggleLike } from '@/api/interactions'
import type { Article } from '@/types/api'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/utils/cn'

interface Props {
  article: Article
}

/**
 * Right-rail reactions card on the article detail page. Optimistic UI:
 * clicking flips the icon immediately and we reconcile against the server
 * response (or roll back on error).
 */
export function ReactionsCard({ article }: Props) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const requireLogin = () => {
    if (!user) {
      navigate('/login', { state: { from: `/articles/${article.slug}` }, viewTransition: true })
      return false
    }
    return true
  }

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(article.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['article', 'slug', article.slug] })
      const prev = qc.getQueryData<Article>(['article', 'slug', article.slug])
      if (prev) {
        qc.setQueryData<Article>(['article', 'slug', article.slug], {
          ...prev,
          liked: !prev.liked,
          _count: {
            ...prev._count,
            likes: prev._count.likes + (prev.liked ? -1 : 1),
          },
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['article', 'slug', article.slug], ctx.prev)
    },
    onSuccess: (resp) => {
      const cur = qc.getQueryData<Article>(['article', 'slug', article.slug])
      if (cur) {
        qc.setQueryData<Article>(['article', 'slug', article.slug], {
          ...cur,
          liked: resp.liked,
          _count: { ...cur._count, likes: resp.likeCount },
        })
      }
    },
  })

  const favMutation = useMutation({
    mutationFn: () => toggleFavorite(article.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['article', 'slug', article.slug] })
      const prev = qc.getQueryData<Article>(['article', 'slug', article.slug])
      if (prev) {
        qc.setQueryData<Article>(['article', 'slug', article.slug], {
          ...prev,
          favorited: !prev.favorited,
          _count: {
            ...prev._count,
            favorites: prev._count.favorites + (prev.favorited ? -1 : 1),
          },
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['article', 'slug', article.slug], ctx.prev)
    },
    onSuccess: (resp) => {
      const cur = qc.getQueryData<Article>(['article', 'slug', article.slug])
      if (cur) {
        qc.setQueryData<Article>(['article', 'slug', article.slug], {
          ...cur,
          favorited: resp.favorited,
          _count: { ...cur._count, favorites: resp.favoriteCount },
        })
      }
      // The Me page favorites list now needs refetching
      qc.invalidateQueries({ queryKey: ['my-favorites'] })
    },
  })

  return (
    <div className="border border-whisper rounded-xl p-3 bg-surface">
      <p className="font-mono text-xs text-steel tracking-[0.04em] px-2 pb-2">REACTIONS</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => requireLogin() && likeMutation.mutate()}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors',
            article.liked
              ? 'text-klein'
              : 'text-steel hover:text-ink hover:bg-whisper-soft',
          )}
          aria-label={article.liked ? '取消点赞' : '点赞'}
        >
          <Heart
            size={18}
            fill={article.liked ? 'currentColor' : 'none'}
            strokeWidth={1.5}
          />
          <span className="font-mono text-xs">{article._count.likes}</span>
        </button>

        <button
          onClick={() => requireLogin() && favMutation.mutate()}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors',
            article.favorited
              ? 'text-klein'
              : 'text-steel hover:text-ink hover:bg-whisper-soft',
          )}
          aria-label={article.favorited ? '取消收藏' : '收藏'}
        >
          <Bookmark
            size={18}
            fill={article.favorited ? 'currentColor' : 'none'}
            strokeWidth={1.5}
          />
          <span className="font-mono text-xs">{article._count.favorites}</span>
        </button>
      </div>
      {!user && (
        <p className="font-mono text-[10px] text-steel text-center mt-2 px-2">
          登录后可点赞 / 收藏
        </p>
      )}
    </div>
  )
}
