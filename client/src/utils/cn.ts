import { type ClassValue } from './kinds'

/**
 * Tiny classnames helper. Filters falsy, joins with spaces.
 * Avoid pulling in `clsx` for two lines of code.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  for (const i of inputs) {
    if (!i) continue
    if (typeof i === 'string' || typeof i === 'number') out.push(String(i))
    else if (Array.isArray(i)) {
      const inner = cn(...i)
      if (inner) out.push(inner)
    } else if (typeof i === 'object') {
      for (const [key, val] of Object.entries(i)) if (val) out.push(key)
    }
  }
  return out.join(' ')
}
