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
