import { http } from './http'
import type { User } from '@/types/api'

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface LoginPayload {
  identifier: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await http.post<{ data: AuthResponse }>('/auth/register', payload)
  return data.data
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await http.post<{ data: AuthResponse }>('/auth/login', payload)
  return data.data
}

export async function fetchMe(): Promise<User> {
  const { data } = await http.get<{ data: User }>('/auth/me')
  return data.data
}
