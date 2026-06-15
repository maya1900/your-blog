import { http } from './http'

export interface LinkPreview {
  url: string
  title: string
  domain: string
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const { data } = await http.get<{ data: LinkPreview }>('/link-preview', {
    params: { url },
  })
  return data.data
}
