import { useEffect, useRef, useState } from 'react'
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

const FADE_MS = 320

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Layer({ pose, size, out }: { pose: BlobPoseName; size: number; out?: boolean }) {
  const [shown, setShown] = useState(!!out)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(!out))
    return () => cancelAnimationFrame(id)
  }, [out])
  return (
    <div className={`absolute inset-0 grid place-items-center transition-opacity duration-300 ease-out motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`}>
      <Blob pose={pose} size={size} />
    </div>
  )
}

export function BlobStage({ step, size = 240, className = '' }: { step: BlobStep; size?: number; className?: string }) {
  const pose = BLOB_STEP_POSE[step]
  const [prev, setPrev] = useState<BlobPoseName | null>(null)
  const last = useRef(pose)
  useEffect(() => {
    if (last.current === pose) return
    const from = last.current
    last.current = pose
    if (reduced()) return
    setPrev(from)
    const id = setTimeout(() => setPrev(null), FADE_MS)
    return () => clearTimeout(id)
  }, [pose])
  return (
    <div className={`relative size-full min-h-[17rem] text-hero-ink ${className}`} aria-hidden="true">
      {prev ? <Layer key={`out-${prev}`} pose={prev} size={size} out /> : null}
      <Layer key={`in-${pose}`} pose={pose} size={size} />
    </div>
  )
}
