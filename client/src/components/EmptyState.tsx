import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title, description, action, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && <div className="text-steel mb-4">{icon}</div>}
      <p className="text-lg font-semibold text-ink">{title}</p>
      {description && <p className="mt-1.5 text-sm text-steel max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
