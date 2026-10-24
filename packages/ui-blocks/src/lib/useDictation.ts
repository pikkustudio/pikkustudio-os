import { useCallback, useEffect, useRef, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { usePikkuMutation } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { getLocale } from '@/paraglide/runtime.js'
import type { I18nString } from '@pikku/react'
import { asI18n } from '@pikku/react'

type Format = 'webm' | 'mp4' | 'ogg'
export type DictationState = 'idle' | 'recording' | 'transcribing' | 'error'

const MIN_MS = 1000
const MAX_MS = 120_000

const pickType = (): { mimeType: string; format: Format } | null => {
  if (typeof MediaRecorder === 'undefined') return null
  return (
    [
      { mimeType: 'audio/webm;codecs=opus', format: 'webm' as const },
      { mimeType: 'audio/webm', format: 'webm' as const },
      { mimeType: 'audio/mp4', format: 'mp4' as const },
      { mimeType: 'audio/ogg;codecs=opus', format: 'ogg' as const },
    ].find((c) => MediaRecorder.isTypeSupported(c.mimeType)) ?? null
  )
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).slice((reader.result as string).indexOf(',') + 1))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

type Transcribe = UseMutationResult<{ text: string }, Error, { audioBase64: string; format: Format; language?: string }>

export function useDictation(onText: (text: string) => void) {
  const transcribe = usePikkuMutation('studio:transcribeAudio' as never) as unknown as Transcribe
  const [state, setState] = useState<DictationState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<I18nString | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const failed = useRef<{ blob: Blob; format: Format } | null>(null)
  const timers = useRef<{ tick?: ReturnType<typeof setInterval>; frame?: number; context?: AudioContext }>({})
  const startedAt = useRef(0)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  const release = useCallback(() => {
    const t = timers.current
    if (t.tick) clearInterval(t.tick)
    if (t.frame) cancelAnimationFrame(t.frame)
    void t.context?.close().catch(() => {})
    timers.current = {}
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    setLevel(0)
  }, [])

  useEffect(
    () => () => {
      if (recorder.current && recorder.current.state !== 'inactive') {
        recorder.current.onstop = null
        recorder.current.stop()
      }
      release()
    },
    [release],
  )

  const send = useCallback(
    async (blob: Blob, format: Format) => {
      setState('transcribing')
      failed.current = null
      try {
        const { text } = await transcribe.mutateAsync({ audioBase64: await toBase64(blob), format, language: getLocale() })
        if (!text) {
          setError(m.composer_tools__mic_empty())
          setState('error')
          return
        }
        onTextRef.current(text)
        setState('idle')
      } catch (e) {
        failed.current = { blob, format }
        setError(e instanceof Error && e.message && e.name !== 'NotFoundError' ? asI18n(e.message) : m.composer_tools__mic_failed())
        setState('error')
      }
    },
    [transcribe],
  )

  const stop = useCallback(() => {
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
  }, [])

  const start = useCallback(async () => {
    setError(null)
    failed.current = null
    const type = pickType()
    if (!type || !navigator.mediaDevices?.getUserMedia) {
      setError(m.composer_tools__mic_unsupported())
      setState('error')
      return
    }
    let media: MediaStream
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      const name = (e as DOMException).name
      setError(name === 'NotAllowedError' || name === 'SecurityError' ? m.composer_tools__mic_denied() : name === 'NotFoundError' || name === 'OverconstrainedError' ? m.composer_tools__mic_none() : m.composer_tools__mic_failed())
      setState('error')
      return
    }
    stream.current = media
    const chunks: Blob[] = []
    const rec = new MediaRecorder(media, { mimeType: type.mimeType })
    recorder.current = rec
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = () => {
      const long = Date.now() - startedAt.current >= MIN_MS
      release()
      if (!long) {
        setError(m.composer_tools__mic_short())
        setState('error')
        return
      }
      const blob = new Blob(chunks, { type: type.mimeType })
      void send(blob, type.format)
    }
    try {
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      context.createMediaStreamSource(media).connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      const loop = () => {
        analyser.getByteTimeDomainData(data)
        let peak = 0
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128))
        setLevel(Math.min(1, peak / 64))
        timers.current.frame = requestAnimationFrame(loop)
      }
      timers.current.context = context
      loop()
    } catch {}
    startedAt.current = Date.now()
    setSeconds(0)
    timers.current.tick = setInterval(() => {
      const ms = Date.now() - startedAt.current
      setSeconds(Math.floor(ms / 1000))
      if (ms >= MAX_MS) stop()
    }, 250)
    rec.start()
    setState('recording')
  }, [release, send, stop])

  const retry = useCallback(() => {
    if (failed.current) void send(failed.current.blob, failed.current.format)
    else void start()
  }, [send, start])

  const dismiss = useCallback(() => {
    failed.current = null
    setError(null)
    setState('idle')
  }, [])

  return { state, seconds, level, error, start, stop, retry, dismiss }
}
