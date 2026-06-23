import { http } from './http'
import type { PagedResult, Role, User, Comment } from '@/types/api'

// ===== Stats =====

export interface AdminStats {
  totals: {
    users: number
    visits: number
    pageviews: number
    articles: number
    published: number
    drafts: number
    comments: number
    categories: number
    tags: number
    views: number
    likes: number
    favorites: number
  }
  thisWeek: {
    articles: number
    visits: number
    pageviews: number
    comments: number
    users: number
  }
  trend: { date: string; count: number }[]
  topCategories: { id: number; name: string; count: number }[]
  recentArticles: {
    id: number
    title: string
    slug: string
    status: 'DRAFT' | 'PUBLISHED'
    viewCount: number
    createdAt: string
    publishedAt: string | null
    author: { id: number; username: string; nickname: string; avatar: string | null }
    category: { id: number; name: string } | null
  }[]
  recentComments: {
    id: number
    content: string
    createdAt: string
    user: { id: number; username: string; nickname: string; avatar: string | null }
    article: { id: number; slug: string; title: string }
  }[]
}

export async function getStats(): Promise<AdminStats> {
  const { data } = await http.get<{ data: AdminStats }>('/admin/stats')
  return data.data
}

export async function downloadSiteExport(): Promise<void> {
  const resp = await http.get<Blob>('/admin/export', { responseType: 'blob' })
  const cd = (resp.headers['content-disposition'] as string | undefined) ?? ''
  const match = /filename="([^"]+)"/.exec(cd)
  const filename = match ? match[1] : 'your-blog-export.json'

  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// ===== Users =====

export interface AdminUser extends User {
  _count?: { articles: number; comments: number }
}

export interface ListUsersParams {
  page?: number
  pageSize?: number
  keyword?: string
  role?: Role
}

export async function listUsers(params: ListUsersParams = {}): Promise<PagedResult<AdminUser>> {
  const { data } = await http.get<{ data: PagedResult<AdminUser> }>('/admin/users', {
    params,
  })
  return data.data
}

export interface UpdateUserInput {
  nickname?: string
  email?: string
  bio?: string | null
  avatar?: string | null
  role?: Role
  isActive?: boolean
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  const { data } = await http.patch<{ data: User }>(`/admin/users/${id}`, input)
  return data.data
}

export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
  await http.post(`/admin/users/${id}/password`, { newPassword })
}

// ===== Comments (admin all) =====

export interface AdminComment extends Comment {
  article: { id: number; slug: string; title: string }
}

export interface ListAllCommentsParams {
  page?: number
  pageSize?: number
  keyword?: string
}

export async function listAllComments(
  params: ListAllCommentsParams = {},
): Promise<PagedResult<AdminComment>> {
  const { data } = await http.get<{ data: PagedResult<AdminComment> }>('/admin/comments', {
    params,
  })
  return data.data
}
