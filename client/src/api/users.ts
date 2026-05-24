import { http } from './http'
import type { User } from '@/types/api'

export interface UpdateMeInput {
  username?: string
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
