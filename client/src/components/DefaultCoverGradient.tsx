import type { ReactElement } from 'react'

interface Props {
  title: string
  className?: string
}

// djb2 hash — small, deterministic, no deps.
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// Two-stop gradients harmonized with the site's klein/cyan/emerald/amber palette.
// Deeper end-stops so the white overlay shapes read against the background.
const PALETTES: Array<[string, string]> = [
  ['#0033CC', '#1E1B4B'], // klein-deep → indigo-950
  ['#0E7490', '#3D5AFE'], // cyan → klein-soft
  ['#047857', '#134E4A'], // emerald → teal-900
  ['#B45309', '#7C2D12'], // amber → orange-900
  ['#5B21B6', '#1E1B4B'], // purple → indigo-950
  ['#9D174D', '#581C87'], // rose → purple-900
]

function firstChar(s: string): string {
  const t = s.trim()
  if (!t) return '·'
  return Array.from(t)[0].toUpperCase()
}

/**
 * Deterministic 16:9 SVG cover rendered from the article title — used when an
 * article has no `coverUrl`. Two-color gradient + soft circle + diagonal line
 * + a large semi-transparent first character. Same title → same image.
 */
export function DefaultCoverGradient({ title, className }: Props): ReactElement {
  const h = hash(title || 'untitled')
  const [from, to] = PALETTES[h % PALETTES.length]
  const angle = 110 + (h % 70)             // 110°–180°
  const cx = 1050 + ((h >> 3) % 300)        // 1050–1350
  const cy = 100 + ((h >> 6) % 200)         // 100–300
  const r = 280 + ((h >> 9) % 120)          // 280–400
  const lineY = 500 + ((h >> 12) % 200)     // 500–700
  const initial = firstChar(title)
  // Per-instance gradient id avoids collisions when many of these render together.
  const gid = `dcg-${(h % 1_000_000).toString(36)}`

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`封面:${title || 'Untitled'}`}
      className={className}
    >
      <defs>
        <linearGradient
          id={gid}
          gradientTransform={`rotate(${angle} 0.5 0.5)`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${gid})`} />
      <circle cx={cx} cy={cy} r={r} fill="white" opacity="0.08" />
      <line
        x1="0"
        y1={lineY}
        x2="1600"
        y2={lineY - 200}
        stroke="white"
        strokeOpacity="0.16"
        strokeWidth="1.5"
      />
      <text
        x="80"
        y="820"
        fontSize="520"
        fontWeight="700"
        fontFamily="'Inter', system-ui, -apple-system, 'Helvetica Neue', sans-serif"
        fill="white"
        fillOpacity="0.14"
        textAnchor="start"
      >
        {initial}
      </text>
    </svg>
  )
}
