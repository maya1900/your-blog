import { http } from './http'
import type { PublicUser, User } from '@/types/api'

export interface UpdateMeInput {
  nickname?: string
  bio?: string | null
  avatar?: string | null
}

export async function updateMe(input: UpdateMeInput): Promise<User> {
  const { data } = await http.patch<{ data: User }>('/users/me', input)
  return data.data
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await http.post('/users/me/password', input)
}

export async function getUserByUsername(username: string): Promise<PublicUser> {
  const { data } = await http.get<{ data: PublicUser }>(
    `/users/${encodeURIComponent(username)}`,
  )
  return data.data
}
