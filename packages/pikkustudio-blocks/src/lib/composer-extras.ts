import { useCallback, useEffect, useRef, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { usePikkuMutation } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'

export const MAX_FILE_BYTES = 25 * 1024 * 1024

export type ComposerFile = {
  id: string
  name: string
  size: number
  image: boolean
  preview: string | null
  status: 'uploading' | 'ready' | 'failed'
  path: string | null
  problem: string | null
  source: File
}

type Attach = UseMutationResult<{ name: string; path: string; size: number }, Error, { key: string; name: string; data: string }>

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).slice((reader.result as string).indexOf(',') + 1))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

export function useComposerExtras(projectKey: string) {
  const attach = usePikkuMutation('studio:builderAttach' as never) as unknown as Attach
  const [files, setFiles] = useState<ComposerFile[]>([])
  const patch = useCallback((id: string, next: Partial<ComposerFile>) => setFiles((all) => all.map((f) => (f.id === id ? { ...f, ...next } : f))), [])
  const keyRef = useRef(projectKey)
  keyRef.current = projectKey

  const upload = useCallback(
    async (file: ComposerFile) => {
      patch(file.id, { status: 'uploading', problem: null })
      try {
        const done = await attach.mutateAsync({ key: keyRef.current, name: file.name, data: await toBase64(file.source) })
        patch(file.id, { status: 'ready', path: done.path })
      } catch (e) {
        patch(file.id, { status: 'failed', problem: e instanceof Error && e.message ? e.message : m.composer_tools__upload_failed({ name: file.name }) })
      }
    },
    [attach, patch],
  )

  const add = useCallback(
    (list: Iterable<File>) => {
      for (const source of list) {
        const image = source.type.startsWith('image/')
        const entry: ComposerFile = {
          id: crypto.randomUUID(),
          name: source.name || (image ? `picture.${source.type.split('/')[1] ?? 'png'}` : 'file'),
          size: source.size,
          image,
          preview: image ? URL.createObjectURL(source) : null,
          status: 'uploading',
          path: null,
          problem: null,
          source,
        }
        if (source.size > MAX_FILE_BYTES) {
          setFiles((all) => [...all, { ...entry, status: 'failed', problem: m.composer_tools__too_big({ name: entry.name }) }])
          continue
        }
        setFiles((all) => [...all, entry])
        void upload(entry)
      }
    },
    [upload],
  )

  const remove = useCallback((id: string) => {
    setFiles((all) => {
      const gone = all.find((f) => f.id === id)
      if (gone?.preview) URL.revokeObjectURL(gone.preview)
      return all.filter((f) => f.id !== id)
    })
  }, [])

  const retry = useCallback((id: string) => {
    const file = files.find((f) => f.id === id)
    if (file && file.source.size <= MAX_FILE_BYTES) void upload(file)
  }, [files, upload])

  const busy = files.some((f) => f.status === 'uploading')
  const suffix = useCallback(() => {
    const ready = files.filter((f) => f.status === 'ready' && f.path)
    return ready.length ? `\n\n${m.composer_tools__attached_note({ files: ready.map((f) => f.path).join(', ') })}` : ''
  }, [files])
  const clear = useCallback(() => {
    setFiles((all) => {
      all.forEach((f) => f.preview && URL.revokeObjectURL(f.preview))
      return []
    })
  }, [])

  useEffect(() => clear, [projectKey, clear])

  return { files, add, remove, retry, busy, suffix, clear }
}

export type ComposerExtras = ReturnType<typeof useComposerExtras>
