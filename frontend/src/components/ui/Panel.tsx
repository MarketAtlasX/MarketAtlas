import type { ReactNode } from 'react'

interface PanelProps {
  title?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  glow?: 'accent' | 'positive' | 'warning' | 'critical'
  scan?: boolean
  corners?: boolean
}

export default function Panel({ title, right, children, className = '', glow, scan, corners }: PanelProps) {
  const glowCls = glow ? `glow-${glow}` : ''
  return (
    <section className={`panel ${glowCls} ${scan ? 'scanline' : ''} ${corners ? 'hud-corners' : ''} ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--line)]">
          {title ? <h3 className="panel-title">{title}</h3> : <span />}
          {right}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  )
}
