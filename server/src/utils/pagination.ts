import { z } from 'zod'

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export type PaginationInput = z.infer<typeof PaginationSchema>

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export function paginated<T>(
  items: T[],
  total: number,
  { page, pageSize }: PaginationInput,
): Page<T> {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export function skipTake({ page, pageSize }: PaginationInput) {
  return { skip: (page - 1) * pageSize, take: pageSize }
}
