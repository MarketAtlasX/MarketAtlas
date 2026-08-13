interface TabItem<T extends string> {
  key: T
  label: string
  icon?: React.ReactNode
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}

export default function Tabs<T extends string>({ items, value, onChange, className = '' }: TabsProps<T>) {
  return (
    <div className={`flex items-stretch rounded-lg border border-[var(--line)] overflow-hidden ${className}`}>
      {items.map(item => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`flex-1 px-2 py-1.5 text-[10px] font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5 ${
              active
                ? 'bg-[rgba(56,232,255,0.12)] text-[var(--accent)]'
                : 'text-[var(--text-lo)] hover:text-[var(--text-mid)] hover:bg-[rgba(95,125,153,0.08)]'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
