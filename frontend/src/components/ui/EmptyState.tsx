import React from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-[var(--line)] rounded">
      {icon && <div className="text-[var(--text-lo)] mb-2">{icon}</div>}
      <h4 className="text-[12px] font-mono font-medium text-[var(--text-mid)]">{title}</h4>
      {description && <p className="text-[10px] text-[var(--text-lo)] max-w-xs mt-1">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-[10px] font-mono px-3 py-1 border border-[rgba(56,232,255,0.3)] rounded text-[var(--accent)] hover:bg-[rgba(56,232,255,0.1)] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
