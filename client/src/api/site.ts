import { http } from './http'

export interface SiteSettings {
  siteTitle: string
  siteTagline: string
  /** Empty string means "no logo, render the title text" */
  siteLogo: string
  /** Empty string means "use the bundled default favicon" */
  siteFavicon: string
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data } = await http.get<{ data: SiteSettings }>('/site/settings')
  return data.data
}

export async function updateSiteSettings(
  input: Partial<SiteSettings>,
): Promise<SiteSettings> {
  const { data } = await http.put<{ data: SiteSettings }>(
    '/admin/site/settings',
    input,
  )
  return data.data
}

export interface AboutContent {
  content: string
  updatedAt: string | null
}

export async function getAbout(): Promise<AboutContent> {
  const { data } = await http.get<{ data: AboutContent }>('/site/about')
  return data.data
}

export async function updateAbout(content: string): Promise<AboutContent> {
  const { data } = await http.put<{ data: AboutContent }>('/admin/site/about', {
    content,
  })
  return data.data
}
