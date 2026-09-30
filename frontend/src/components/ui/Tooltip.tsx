import React, { useState } from 'react'

export interface TooltipProps {
  content: string
  children: React.ReactNode
  placement?: 'top' | 'bottom'
}

export default function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute left-1/2 -translate-x-1/2 z-50 px-2 py-1 text-[10px] font-mono rounded bg-[var(--bg-overlay)] text-[var(--text-hi)] border border-[var(--line)] whitespace-nowrap shadow-lg ${
            placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
