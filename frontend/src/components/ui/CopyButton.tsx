import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export interface CopyButtonProps {
  textToCopy: string
  label?: string
}

export default function CopyButton({ textToCopy, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 border border-[var(--line)] rounded text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:border-[var(--text-lo)] transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check size={11} className="text-[var(--bull)]" /> : <Copy size={11} />}
      {label && <span>{copied ? 'Copied!' : label}</span>}
    </button>
  )
}
