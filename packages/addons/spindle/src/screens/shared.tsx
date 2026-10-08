import { useCallback, useState } from 'react'
import { m } from '@/i18n/messages'
import { usePikkuRPC, type I18nString } from '@pikku/react'
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
  return h.source === 'page' ? m.spindle_shared__where_page({ page: h.page ?? 0 }) : h.source === 'speech' ? m.spindle_shared__where_speech({ seconds: Math.floor(start) }) : h.source === 'frame' ? m.spindle_shared__where_frame({ seconds: Math.floor(frame) }) : m.spindle_shared__where_summary()
}

export const KIND = {
  document: { icon: FileText, label: m.spindle_shared__kind_document },
  text: { icon: FileText, label: m.spindle_shared__kind_text },
  audio: { icon: Mic, label: m.spindle_shared__kind_audio },
  video: { icon: Film, label: m.spindle_shared__kind_video },
  image: { icon: Image, label: m.spindle_shared__kind_image },
} as const

export const kindOf = (kind: string) => KIND[kind as keyof typeof KIND] ?? KIND.document

export const STATE = {
  uploaded: { tone: 'quiet', label: m.spindle_shared__state_uploaded },
  extracting: { tone: 'warn', label: m.spindle_shared__state_extracting },
  extracted: { tone: 'ok', label: m.spindle_shared__state_extracted },
  failed: { tone: 'bad', label: m.spindle_shared__state_failed },
} as const

export const stateOf = (status: string) => STATE[status as keyof typeof STATE] ?? STATE.uploaded

export const STEP = {
  extract: m.spindle_shared__step_extract,
  probe: m.spindle_shared__step_probe,
  transcribe: m.spindle_shared__step_transcribe,
  keyframes: m.spindle_shared__step_keyframes,
  categorise: m.spindle_shared__step_categorise,
  summarise: m.spindle_shared__step_summarise,
  place: m.spindle_shared__step_place,
} as const

export const useBusy = (reload: () => Promise<void>) => {
  const [busy, setBusy] = useState<I18nString | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(
    async (label: I18nString, work: () => Promise<void>) => {
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
