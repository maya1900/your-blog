import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSiteSettings, type SiteSettings } from '@/api/site'

const FALLBACK: SiteSettings = {
  siteTitle: '墨记',
  siteTagline: '用 React + Express + Prisma 写的。慢一点,但写完每一行都想清楚了。',
  siteLogo: '',
  siteFavicon: '',
}

/**
 * Read site-wide labels (title, tagline, logo, favicon). Cached for the entire
 * session — these change rarely and are rendered on every page. Returns
 * sensible fallbacks during the initial fetch so the first paint isn't blank.
 *
 * Also keeps the document title and `<link rel="icon">` in sync with the
 * configured values.
 */
export function useSiteSettings(): SiteSettings {
  const { data } = useQuery({
    queryKey: ['site', 'settings'],
    queryFn: getSiteSettings,
    staleTime: Infinity,
    gcTime: Infinity,
  })
  const settings = data ?? FALLBACK

  // Sync browser tab title
  useEffect(() => {
    if (settings.siteTitle) document.title = settings.siteTitle
  }, [settings.siteTitle])

  // Sync favicon. Reuse an existing <link rel="icon"> if there is one,
  // otherwise insert a new one. Empty string falls back to /favicon.ico
  // (or whatever was bundled in index.html).
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = settings.siteFavicon || '/favicon.ico'
  }, [settings.siteFavicon])

  return settings
}
