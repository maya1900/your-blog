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

export interface CategoryInput {
  name: string
  slug?: string
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await http.post<{ data: Category }>('/admin/categories', input)
  return data.data
}

export async function updateCategory(id: number, input: CategoryInput): Promise<Category> {
  const { data } = await http.put<{ data: Category }>(`/admin/categories/${id}`, input)
  return data.data
}

export async function deleteCategory(id: number): Promise<void> {
  await http.delete(`/admin/categories/${id}`)
}

export async function deleteTag(id: number): Promise<void> {
  await http.delete(`/admin/tags/${id}`)
}
