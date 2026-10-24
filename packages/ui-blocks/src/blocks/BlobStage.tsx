import { Blob, type BlobPoseName } from './Blob'

export type BlobStep =
  | 'choosing'
  | 'typing'
  | 'sending'
  | 'checking'
  | 'waiting'
  | 'question'
  | 'done'
  | 'connected'
  | 'error'
  | 'empty'
  | 'notStarted'

export const BLOB_STEP_POSE: Record<BlobStep, BlobPoseName> = {
  choosing: 'blob',
  typing: 'tall',
  sending: 'think',
  checking: 'think',
  waiting: 'ask',
  question: 'ask',
  done: 'blob',
  connected: 'blob',
  error: 'alert',
  empty: 'sleep',
  notStarted: 'sleep',
}

export function BlobStage({ step, size = 420, className = '' }: { step: BlobStep; size?: number; className?: string }) {
  return (
    <div className={`relative grid size-full min-h-[22rem] place-items-center text-hero-ink ${className}`} aria-hidden="true">
      <Blob pose={BLOB_STEP_POSE[step]} size={size} />
    </div>
  )
}
