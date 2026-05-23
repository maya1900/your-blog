/**
 * Format Date or ISO string → "yyyy/mm/dd"
 */
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

/**
 * Estimate read time. Counts CJK chars as 1, English words as 1, then divides
 * by ~300 (a comfortable mixed-text reading rate).
 */
export function estimateReadTime(text: string): number {
  if (!text) return 0
  const cjk = text.match(/[一-龥]/g)?.length ?? 0
  const enWords = text.replace(/[一-龥]/g, ' ').trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil((cjk + enWords) / 300)
  return Math.max(1, minutes)
}
