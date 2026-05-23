import { http } from './http'
import type { Comment, PagedResult } from '@/types/api'

export async function listComments(
  articleId: number,
  params: { page?: number; pageSize?: number } = {},
): Promise<PagedResult<Comment>> {
  const { data } = await http.get<{ data: PagedResult<Comment> }>(
    `/articles/${articleId}/comments`,
    { params },
  )
  return data.data
}

export async function createComment(articleId: number, content: string): Promise<Comment> {
  const { data } = await http.post<{ data: Comment }>(
    `/articles/${articleId}/comments`,
    { content },
  )
  return data.data
}

export async function deleteComment(articleId: number, commentId: number): Promise<void> {
  await http.delete(`/articles/${articleId}/comments/${commentId}`)
}
