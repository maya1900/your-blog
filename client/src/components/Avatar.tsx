import { cn } from '@/utils/cn'

interface AvatarProps {
  username: string
  avatar?: string | null
  size?: number
  className?: string
}

export function Avatar({ username, avatar, size = 32, className }: AvatarProps) {
  const initial = username?.[0]?.toUpperCase() ?? '?'
  return (
    <div
      className={cn(
        'rounded-full ring-1 ring-whisper bg-whisper-soft overflow-hidden flex items-center justify-center text-steel font-medium shrink-0',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.42)),
      }}
    >
      {avatar ? (
        <img src={avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  )
}
