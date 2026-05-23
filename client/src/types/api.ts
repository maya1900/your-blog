export type Role = 'USER' | 'ADMIN'
export type ArticleStatus = 'DRAFT' | 'PUBLISHED'

export interface User {
  id: number
  username: string
  email: string
  role: Role
  avatar: string | null
  bio: string | null
  isActive: boolean
  createdAt: string
}

export interface AuthorSummary {
  id: number
  username: string
  avatar: string | null
}

export interface Category {
  id: number
  name: string
  slug: string
  _count?: { articles: number }
}

export interface Tag {
  id: number
  name: string
  _count?: { articles: number }
}

export interface Article {
  id: number
  title: string
  slug: string
  summary: string | null
  content: string
  coverUrl: string | null
  status: ArticleStatus
  viewCount: number
  authorId: number
  categoryId: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  author: AuthorSummary
  category: Category
  tags: Tag[]
  _count: {
    comments: number
    likes: number
    favorites: number
  }
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

export interface ApiEnvelope<T> {
  data?: T
  error?: ApiError
}
