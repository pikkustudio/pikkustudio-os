import { useCallback, useState } from 'react'
import { usePikkuRPC } from '@pikku/react'
import { FileText, Film, Image, Mic } from 'lucide-react'

export type ScreenProps = { params: Record<string, string>; navigate: (path: string) => void }
export type Asset = { asset_id: string; catalogue_number: number; title: string; kind: string; status: string }
export type Kb = { kb_id: string; name: string; description: string; assetCount: number }
export type Hit = { passageId: string; assetId: string; source: string; page: number | null; startSeconds: number | null; frameAt: number | null; text: string; matchedBy: string }
export type Rpc = { invoke: (name: string, data?: unknown) => Promise<any> }

export const useRpc = () => usePikkuRPC() as unknown as Rpc

export const where = (h: { source: string; page: number | null; startSeconds?: number | null; start_seconds?: number | null; frameAt?: number | null; frame_at?: number | null }) => {
  const start = h.startSeconds ?? h.start_seconds ?? 0
  const frame = h.frameAt ?? h.frame_at ?? 0
  return h.source === 'page' ? `page ${h.page}` : h.source === 'speech' ? `${Math.floor(start)}s in` : h.source === 'frame' ? `frame at ${Math.floor(frame)}s` : 'summary'
}

export const KIND = {
  document: { icon: FileText, label: 'Document' },
  text: { icon: FileText, label: 'Text' },
  audio: { icon: Mic, label: 'Recording' },
  video: { icon: Film, label: 'Video' },
  image: { icon: Image, label: 'Image' },
} as const

export const kindOf = (kind: string) => KIND[kind as keyof typeof KIND] ?? KIND.document

export const STATE = {
  uploaded: { tone: 'quiet', label: 'Waiting to be read' },
  extracting: { tone: 'warn', label: 'Reading it now' },
  extracted: { tone: 'ok', label: 'Ready to search' },
  failed: { tone: 'bad', label: 'Could not be read' },
} as const

export const stateOf = (status: string) => STATE[status as keyof typeof STATE] ?? STATE.uploaded

export const STEP = {
  extract: 'Read the text',
  probe: 'Looked at the recording',
  transcribe: 'Wrote down what was said',
  keyframes: 'Picked out key frames',
  categorise: 'Described the pictures',
  summarise: 'Wrote a short summary',
  place: 'Chose collections',
} as const

export const useBusy = (reload: () => Promise<void>) => {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(
    async (label: string, work: () => Promise<void>) => {
      setBusy(label)
      setError(null)
      try {
        await work()
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(null)
      }
    },
    [reload],
  )
  return { busy, error, run }
}
