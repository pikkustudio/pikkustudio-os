import type { StudioAi } from '../services/ai.js'
import type { StudioProjectsService } from '../services/projects.js'

export type ModelEndpoint = { baseUrl: string; apiKey: string; fallback: string | null }

const withV1 = (url: string) => {
  const base = url.replace(/\/+$/, '')
  return base.endsWith('/v1') ? base : `${base}/v1`
}

export async function modelEndpoint(studio: { ai: StudioAi; projects: StudioProjectsService }): Promise<ModelEndpoint | null> {
  const proxyUrl = process.env.PIKKU_BUILDER_PROXY_URL
  const proxyKey = process.env.PIKKU_BUILDER_PROXY_KEY
  const env = await studio.ai.env()
  const configured = process.env.PIKKU_STUDIO_MODEL ?? env.PIKKU_STUDIO_MODEL ?? null
  if (proxyUrl && proxyKey) return { baseUrl: withV1(proxyUrl), apiKey: proxyKey, fallback: configured }
  if (env.PIKKU_STUDIO_AI === 'fabric' || env.PIKKU_STUDIO_AI === 'cloud') {
    const access = await studio.projects.modelAccess().catch(() => null)
    return access ? { baseUrl: withV1(access.proxyUrl), apiKey: access.apiKey, fallback: configured ?? 'deepseek-v4.1-flash' } : null
  }
  if (env.PIKKU_STUDIO_AI === 'key' && env.PIKKU_STUDIO_AI_BASE_URL) {
    return { baseUrl: withV1(env.PIKKU_STUDIO_AI_BASE_URL), apiKey: env.PIKKU_STUDIO_AI_KEY ?? 'none', fallback: configured }
  }
  return null
}

export const NOT_CHAT = /transcribe|whisper|tts|speech|embed|image|rerank|moderation|dall|audio|realtime/i

export type Tier = 'fast' | 'balanced' | 'best'

export const tierOf = (id: string): Tier => {
  if (/flash|mini|lite|haiku|nano|small|instant/i.test(id)) return 'fast'
  if (/pro\b|opus|max|large|reasoner|ultra/i.test(id)) return 'best'
  return 'balanced'
}

export const audioFormats = ['webm', 'mp4', 'ogg'] as const
