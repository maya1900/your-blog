import { Helmet } from 'react-helmet-async'
import { useSiteSettings } from '@/hooks/useSiteSettings'

interface SeoProps {
  title?: string
  description?: string | null
  image?: string | null
  type?: 'website' | 'article' | 'profile'
  canonicalPath?: string
}

function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

export function Seo({ title, description, image, type = 'website', canonicalPath }: SeoProps) {
  const settings = useSiteSettings()
  const fullTitle = title ? `${title} · ${settings.siteTitle}` : settings.siteTitle
  const desc = description || settings.siteTagline
  const canonical = absoluteUrl(
    canonicalPath ?? `${window.location.pathname}${window.location.search}`,
  )
  const imageUrl = image ? absoluteUrl(image) : undefined

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      <link
        rel="alternate"
        type="application/rss+xml"
        title={`${settings.siteTitle} RSS`}
        href={absoluteUrl('/rss.xml')}
      />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={settings.siteTitle} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}

      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
    </Helmet>
  )
}
