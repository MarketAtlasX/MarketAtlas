export interface DividerProps {
  label?: string
  className?: string
}

export default function Divider({ label, className = '' }: DividerProps) {
  if (!label) {
    return <hr className={`border-t border-[var(--line)] my-3 ${className}`} />
  }

  return (
    <div className={`relative flex items-center py-2 ${className}`}>
      <div className="flex-grow border-t border-[var(--line)]" />
      <span className="flex-shrink mx-2 text-[9px] font-mono uppercase tracking-widest text-[var(--text-lo)]">
        {label}
      </span>
      <div className="flex-grow border-t border-[var(--line)]" />
    </div>
  )
}
