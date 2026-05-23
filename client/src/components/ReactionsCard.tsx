import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Heart, Share2 } from 'lucide-react'
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
      navigate('/login', { state: { from: `/articles/${article.slug}` } })
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

  const handleShare = async () => {
    const url = `${window.location.origin}/articles/${article.slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, url })
      } catch {
        /* user dismissed */
      }
    } else {
      await navigator.clipboard.writeText(url)
      // eslint-disable-next-line no-alert
      alert('链接已复制')
    }
  }

  return (
    <div className="border border-whisper rounded-xl p-3 bg-white">
      <p className="font-mono text-xs text-steel tracking-[0.04em] px-2 pb-2">REACTIONS</p>
      <div className="flex items-center justify-around">
        <button
          onClick={() => requireLogin() && likeMutation.mutate()}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors',
            article.liked
              ? 'text-klein'
              : 'text-steel hover:text-ink hover:bg-whisper-soft',
          )}
          aria-label={article.liked ? '取消点赞' : '点赞'}
        >
          <Heart
            size={18}
            fill={article.liked ? '#0040FF' : 'none'}
            strokeWidth={1.5}
          />
          <span className="font-mono text-xs">{article._count.likes}</span>
        </button>

        <button
          onClick={() => requireLogin() && favMutation.mutate()}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors',
            article.favorited
              ? 'text-klein'
              : 'text-steel hover:text-ink hover:bg-whisper-soft',
          )}
          aria-label={article.favorited ? '取消收藏' : '收藏'}
        >
          <Bookmark
            size={18}
            fill={article.favorited ? '#0040FF' : 'none'}
            strokeWidth={1.5}
          />
          <span className="font-mono text-xs">{article._count.favorites}</span>
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center px-2.5 py-1.5 rounded-md text-steel hover:text-ink hover:bg-whisper-soft transition-colors"
          aria-label="分享"
        >
          <Share2 size={18} strokeWidth={1.5} />
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
