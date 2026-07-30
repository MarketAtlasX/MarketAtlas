import { AlertTriangle, CheckCheck, X } from 'lucide-react'
import type { UserAlert } from '../api/liveEventsApi'

interface AlertPanelProps {
  alerts: UserAlert[]
  unreadCount: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClose: () => void
  onAlertClick: (alert: UserAlert) => void
}

export default function AlertPanel({ alerts, unreadCount, onMarkRead, onMarkAllRead, onClose, onAlertClick }: AlertPanelProps) {
  return (
    <div className="border-b border-white/10 bg-gray-900/95">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-yellow-400" />
          <span className="text-[10px] font-semibold text-gray-300">
            Alerts {unreadCount > 0 && `(${unreadCount})`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-white/5"
            >
              <CheckCheck size={10} />
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-white p-0.5">
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="px-4 py-3 text-[10px] text-gray-500 text-center">No alerts</div>
        ) : (
          alerts.slice(0, 10).map(alert => (
            <button
              key={alert.id}
              onClick={() => {
                onAlertClick(alert)
                if (!alert.is_read) onMarkRead(alert.id)
              }}
              className={`w-full text-left px-4 py-2 hover:bg-white/5 transition-colors flex items-start gap-2 ${
                !alert.is_read ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : 'opacity-60'
              }`}
            >
              <AlertTriangle size={10} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-white truncate">{alert.title}</p>
                {alert.message && (
                  <p className="text-[9px] text-gray-400 line-clamp-1">{alert.message}</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
