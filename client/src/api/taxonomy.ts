import { http } from './http'
import type { Category, Tag } from '@/types/api'

export async function listCategories(): Promise<Category[]> {
  const { data } = await http.get<{ data: Category[] }>('/categories')
  return data.data
}

export async function listTags(): Promise<Tag[]> {
  const { data } = await http.get<{ data: Tag[] }>('/tags')
  return data.data
}
