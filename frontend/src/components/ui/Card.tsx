import React from 'react'

export interface CardProps {
  children: React.ReactNode
  className?: string
  interactive?: boolean
  onClick?: () => void
}

export default function Card({ children, className = '', interactive = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`border border-[var(--line)] bg-[var(--bg-raised)] p-3 rounded transition-all ${
        interactive ? 'cursor-pointer hover:border-[rgba(56,232,255,0.4)] hover:bg-[rgba(17,34,51,0.6)]' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
