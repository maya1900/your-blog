export type Role = 'USER' | 'ADMIN'

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

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

export interface ApiEnvelope<T> {
  data?: T
  error?: ApiError
}
