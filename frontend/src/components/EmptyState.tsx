import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: { label: string; onClick: () => void }
  icon?: React.ReactNode
}

export function EmptyState({
  title = 'No data available',
  description = 'There is nothing to display here yet.',
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-gray-500">
      <div className="mb-4 text-gray-600">
        {icon || <Inbox className="w-12 h-12" />}
      </div>
      <h3 className="text-base font-medium text-gray-400 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-4 text-center max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
