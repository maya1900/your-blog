import { useMemo, useState } from 'react'
import { Check, Copy, Send, Share2 } from 'lucide-react'
import type { Article } from '@/types/api'
import { cn } from '@/utils/cn'

type ShareArticle = Pick<Article, 'title' | 'slug' | 'summary'>

interface ShareProps {
  article: ShareArticle
  className?: string
}

function getArticleUrl(slug: string) {
  const path = `/articles/${encodeURIComponent(slug)}`
  if (typeof window === 'undefined') return path
  return new URL(path, window.location.origin).toString()
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function openShareWindow(url: string) {
  const popup = window.open(url, '_blank', 'noopener,noreferrer,width=720,height=560')
  if (popup) popup.opener = null
}

function useArticleShare(article: ShareArticle) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const url = useMemo(() => getArticleUrl(article.slug), [article.slug])
  const text = article.summary || article.title

  const markCopied = () => {
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const copy = async () => {
    await copyText(url)
    markCopied()
  }

  const share = async () => {
    setBusy(true)
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text, url })
        return
      }
      await copy()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      await copy()
    } finally {
      setBusy(false)
    }
  }

  const targets = [
    {
      label: '微博',
      href: `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(article.title)}`,
    },
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(article.title)}`,
    },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(article.title)}`,
    },
  ]

  return { busy, copied, copy, share, targets, url }
}

export function ArticleShareButton({ article, className }: ShareProps) {
  const { busy, copied, share } = useArticleShare(article)

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm text-steel hover:text-klein disabled:opacity-60',
        className,
      )}
      aria-label="分享文章"
    >
      {copied ? <Check size={14} /> : <Share2 size={14} />}
      {copied ? '已复制' : '分享'}
    </button>
  )
}

export function ArticleShareCard({ article, className }: ShareProps) {
  const { busy, copied, copy, share, targets, url } = useArticleShare(article)

  return (
    <div className={cn('border border-whisper rounded-xl p-4 bg-surface', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-steel tracking-[0.04em]">SHARE</p>
        <span className="font-mono text-[10px] text-steel truncate max-w-[140px]">
          /articles/{article.slug}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={share}
          disabled={busy}
          className="h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-whisper text-sm text-ink hover:border-klein hover:text-klein disabled:opacity-60"
        >
          <Share2 size={14} />
          分享
        </button>
        <button
          type="button"
          onClick={copy}
          className="h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-whisper text-sm text-ink hover:border-klein hover:text-klein"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '已复制' : '复制'}
        </button>
        {targets.map((target) => (
          <button
            key={target.label}
            type="button"
            onClick={() => openShareWindow(target.href)}
            className="h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-whisper text-sm text-steel hover:border-klein hover:text-klein"
          >
            <Send size={13} />
            {target.label}
          </button>
        ))}
      </div>

      <p className="mt-3 font-mono text-[10px] text-steel truncate" aria-live="polite">
        {copied ? '链接已复制' : url}
      </p>
    </div>
  )
}
