import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { NOT_CHAT, audioFormats, modelEndpoint, tierOf } from '../lib/composer.js'

const MIN_AUDIO_BYTES = 2_000
const MAX_AUDIO_BYTES = 8_000_000
const MAX_FILE_BYTES = 25 * 1024 * 1024
const ATTACH_DIR = join('.pikku-runtime', 'content', 'private', 'attachments')
const STT_MODEL = process.env.PIKKU_STUDIO_STT_MODEL ?? 'gpt-4o-transcribe'

export const TranscribeAudioInput = z.object({
  audioBase64: z.string().min(1),
  format: z.enum(audioFormats),
  language: z.string().optional(),
})

export const transcribeAudio = pikkuSessionlessFunc({
  expose: true,
  description: 'Turn a dictated clip into text, with the AI Studio builds with.',
  input: TranscribeAudioInput,
  output: z.object({ text: z.string() }),
  func: async ({ studioAi, studioProjects, studioModels }, { audioBase64, format, language }) => {
    const audio = Buffer.from(audioBase64, 'base64')
    if (audio.byteLength < MIN_AUDIO_BYTES) throw new Error('That recording was too short. Hold on a little longer and try again.')
    if (audio.byteLength > MAX_AUDIO_BYTES) throw new Error('That recording was too long. Try a shorter one.')
    const endpoint = await modelEndpoint({ ai: studioAi, projects: studioProjects })
    if (!endpoint) throw new Error('Dictation needs an AI that can listen. Choose your AI in Settings first.')
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(audio)]), `dictation.${format}`)
    form.append('model', STT_MODEL)
    if (language) form.append('language', language)
    const response = await fetch(`${endpoint.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: endpoint.apiKey === 'none' ? {} : { authorization: `Bearer ${endpoint.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    }).catch(() => null)
    if (!response) throw new Error('Could not reach the AI to write that down. Check your connection and try again.')
    if (!response.ok) throw new Error('The AI you chose cannot turn speech into text. You can type instead.')
    const body = (await response.json().catch(() => ({}))) as { text?: string }
    return { text: (body.text ?? '').trim() }
  },
})

export const BuilderAttachInput = z.object({ key: z.string(), name: z.string().min(1), data: z.string() })

export const builderAttach = pikkuSessionlessFunc({
  expose: true,
  description: 'Keep a file the owner attached to a message inside the project, where the builder can read it.',
  input: BuilderAttachInput,
  output: z.object({ name: z.string(), path: z.string(), size: z.number() }),
  func: async ({ studioAi, studioProjects, studioModels }, { key, name, data }) => {
    const bytes = Buffer.from(data, 'base64')
    if (bytes.length > MAX_FILE_BYTES) throw new Error('That file is too big. Keep each one under 25 MB.')
    const safe = basename(name).replace(/[^\w.\- ]+/g, '_') || 'file'
    const { cwd } = await studioProjects.builderLaunch(key)
    const dir = join(cwd, ATTACH_DIR)
    await mkdir(dir, { recursive: true })
    const stored = `${Date.now().toString(36)}-${safe}`
    await writeFile(join(dir, stored), bytes)
    return { name: safe, path: join(ATTACH_DIR, stored), size: bytes.length }
  },
})

export const BuilderModelsOutput = z.object({
  current: z.string().nullable(),
  fallback: z.string().nullable(),
  models: z.array(z.object({ id: z.string(), tier: z.enum(['fast', 'balanced', 'best']) })),
})

export const builderModels = pikkuSessionlessFunc({
  expose: true,
  description: 'The models the builder can use for a project, and the one it uses now.',
  input: z.object({ key: z.string() }),
  output: BuilderModelsOutput,
  func: async ({ studioAi, studioProjects, studioModels }, { key }) => {
    const endpoint = await modelEndpoint({ ai: studioAi, projects: studioProjects })
    if (!endpoint) return { current: null, fallback: null, models: [] }
    const current = studioModels.get(key) ?? endpoint.fallback
    const response = await fetch(`${endpoint.baseUrl}/models`, {
      headers: endpoint.apiKey === 'none' ? {} : { authorization: `Bearer ${endpoint.apiKey}` },
      signal: AbortSignal.timeout(8_000),
    }).catch(() => null)
    const ids = response?.ok
      ? (((await response.json().catch(() => ({}))) as { data?: { id?: string }[] }).data ?? []).flatMap((m) => (m.id && !NOT_CHAT.test(m.id) ? [m.id] : []))
      : []
    const all = [...new Set([...(endpoint.fallback ? [endpoint.fallback] : []), ...ids])]
    return { current, fallback: endpoint.fallback, models: all.map((id) => ({ id, tier: tierOf(id) })) }
  },
})

export const setBuilderModel = pikkuSessionlessFunc({
  expose: true,
  description: 'Choose the model the builder uses for a project from its next message on. Empty goes back to the default.',
  input: z.object({ key: z.string(), model: z.string() }),
  output: z.object({ model: z.string().nullable() }),
  func: async ({ studioAi, studioProjects, studioModels }, { key, model }) => {
    const id = model.trim()
    if (!id) {
      studioModels.delete(key)
      return { model: null }
    }
    const endpoint = await modelEndpoint({ ai: studioAi, projects: studioProjects })
    if (!endpoint) throw new Error('Choose your AI before picking a model')
    studioModels.set(key, id)
    return { model: id }
  },
})
