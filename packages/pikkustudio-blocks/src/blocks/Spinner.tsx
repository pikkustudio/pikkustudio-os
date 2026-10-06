import { Sparkles } from 'lucide-react'

export function Spinner() {
  return <span className="size-4.5 animate-spin-fast rounded-full border-spinner border-current border-r-transparent" aria-hidden="true" />
}

export function AiSpinner({ className = 'size-4.5' }: { className?: string }) {
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} aria-hidden="true">
      <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-25" />
      <Sparkles className="relative size-[80%] animate-pulse" />
    </span>
  )
}
