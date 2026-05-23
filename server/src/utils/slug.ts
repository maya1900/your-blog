import { nanoid } from './nanoid.js'

/**
 * Generate a URL-friendly slug from a title.
 * - Strip CJK & symbols, keep [a-z0-9-]
 * - Spaces / underscores → hyphens
 * - Collapse repeated hyphens, trim leading/trailing
 * - Fall back to nanoid(10) if the cleaned result is too short
 */
export function generateSlug(title: string): string {
  const cleaned = title
    .toLowerCase()
    .trim()
    // Drop everything that's not ASCII letter/number/space/hyphen
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (cleaned.length >= 3) return cleaned.slice(0, 80)
  return `post-${nanoid(10)}`
}

/**
 * Append a short random suffix to disambiguate collisions.
 */
export function withSuffix(slug: string): string {
  return `${slug}-${nanoid(6)}`
}
