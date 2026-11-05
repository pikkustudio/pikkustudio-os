import { Blob } from './Blob'

export function Spinner() {
  return <span className="size-4.5 animate-spin-fast rounded-full border-spinner border-current border-e-transparent" aria-hidden="true" />
}

/** Pikku is working on it: the blob, thinking. */
export function AiSpinner({ className = 'size-4.5' }: { className?: string }) {
  return <Blob pose="think" className={`shrink-0 ${className}`} aria-hidden="true" />
}
