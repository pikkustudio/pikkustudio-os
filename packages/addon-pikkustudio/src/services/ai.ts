import { existsSync, readFileSync } from 'node:fs'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface KeyProvider {
  id: string
  name: string
  envVar: string
  baseUrl: string
  model: string
}

export interface SubscriptionProvider {
  id: string
  name: string
  piLogin: string
}

export const KEY_PROVIDERS: KeyProvider[] = [
  { id: 'openai', name: 'OpenAI', envVar: 'OPENAI_API_KEY', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
  { id: 'anthropic', name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-haiku-4-5' },
  { id: 'gemini', name: 'Google Gemini', envVar: 'GEMINI_API_KEY', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash-lite' },
  { id: 'xai', name: 'xAI (Grok)', envVar: 'XAI_API_KEY', baseUrl: 'https://api.x.ai/v1', model: 'grok-3-mini' },
  { id: 'mistral', name: 'Mistral', envVar: 'MISTRAL_API_KEY', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
  { id: 'deepseek', name: 'DeepSeek', envVar: 'DEEPSEEK_API_KEY', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'groq', name: 'Groq', envVar: 'GROQ_API_KEY', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { id: 'litellm', name: 'LiteLLM (your own proxy)', envVar: 'LITELLM_API_KEY', baseUrl: 'http://localhost:4000', model: '' },
  { id: 'openrouter', name: 'OpenRouter', envVar: 'OPENROUTER_API_KEY', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4.1-mini' },
]

export const SUBSCRIPTION_PROVIDERS: SubscriptionProvider[] = [
  { id: 'openai-codex', name: 'ChatGPT Plus or Pro', piLogin: 'ChatGPT Plus/Pro (Codex)' },
  { id: 'xai', name: 'Grok (X subscription)', piLogin: 'xAI (Grok/X subscription)' },
  { id: 'github-copilot', name: 'GitHub Copilot', piLogin: 'GitHub Copilot' },
]

export type AiChoice =
  | { kind: 'key'; provider: string; model: string; baseUrl?: string }
  | { kind: 'subscription'; provider: string }
  | { kind: 'fabric' }

export type AiInput =
  | { kind: 'key'; provider: string; apiKey: string; model?: string; baseUrl?: string }
  | { kind: 'subscription'; provider: string }
  | { kind: 'fabric' }

async function litellmModel(baseUrl: string, apiKey: string): Promise<string> {
  const response = await fetch(`${baseUrl}/v1/models`, {
    headers: apiKey === 'none' ? {} : { authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!response) throw new Error(`Could not reach LiteLLM at ${baseUrl}. Is it running?`)
  if (response.status === 401 || response.status === 403) throw new Error('LiteLLM did not accept that key')
  if (!response.ok) throw new Error(`LiteLLM answered ${response.status}. Check the address.`)
  const ids = ((await response.json().catch(() => ({}))) as { data?: { id?: string }[] }).data?.flatMap((m) => (m.id ? [m.id] : [])) ?? []
  if (!ids.length) throw new Error('LiteLLM has no models set up yet')
  return ids.find((id) => id === 'default') ?? ids[0]!
}

export class StudioAi {
  constructor(private home: string) {}

  private get choicePath() {
    return join(this.home, 'ai.json')
  }

  private get keysPath() {
    return join(this.home, 'ai-keys.json')
  }

  async choice(): Promise<AiChoice | null> {
    if (!existsSync(this.choicePath)) return null
    return JSON.parse(await readFile(this.choicePath, 'utf8')).choice ?? null
  }

  private async keys(): Promise<Record<string, string>> {
    if (!existsSync(this.keysPath)) return {}
    return JSON.parse(await readFile(this.keysPath, 'utf8'))
  }

  usesFabric(): boolean {
    if (!existsSync(this.choicePath)) return false
    return (JSON.parse(readFileSync(this.choicePath, 'utf8')).choice as AiChoice | null)?.kind === 'fabric'
  }

  chatConfig(): { baseUrl: string; apiKey: string; model: string; provider: string } | null {
    if (!existsSync(this.choicePath)) return null
    const choice = JSON.parse(readFileSync(this.choicePath, 'utf8')).choice as AiChoice | null
    if (choice?.kind !== 'key') return null
    const provider = KEY_PROVIDERS.find((p) => p.id === choice.provider)
    const keys = existsSync(this.keysPath) ? JSON.parse(readFileSync(this.keysPath, 'utf8')) : {}
    const apiKey = keys[choice.provider]
    if (!provider || !apiKey) return null
    const base = (choice.baseUrl ?? provider.baseUrl).replace(/\/$/, '')
    return {
      baseUrl: provider.id === 'litellm' && !base.endsWith('/v1') ? `${base}/v1` : base,
      apiKey,
      model: choice.model,
      provider: provider.id,
    }
  }

  async set(input: AiInput): Promise<AiChoice> {
    let choice: AiChoice
    if (input.kind === 'key') {
      const provider = KEY_PROVIDERS.find((p) => p.id === input.provider)
      if (!provider) throw new Error(`Studio does not know ${input.provider}`)
      const apiKey = input.apiKey.trim() || (provider.id === 'litellm' ? 'none' : '')
      if (!apiKey) throw new Error('Paste the key first')
      const baseUrl = provider.id === 'litellm' ? input.baseUrl?.trim().replace(/\/+$/, '') : undefined
      let model = input.model?.trim() || provider.model
      if (provider.id === 'litellm') {
        if (!URL.canParse(baseUrl ?? '')) throw new Error('Paste the address of your LiteLLM proxy')
        if (!model) model = await litellmModel(baseUrl!, apiKey)
      }
      if (!model) throw new Error('Say which model to use')
      const keys = await this.keys()
      keys[provider.id] = apiKey
      await mkdir(this.home, { recursive: true })
      await writeFile(this.keysPath, JSON.stringify(keys, null, 2) + '\n', { mode: 0o600 })
      await chmod(this.keysPath, 0o600)
      choice = { kind: 'key', provider: provider.id, model, ...(baseUrl ? { baseUrl } : {}) }
    } else if (input.kind === 'subscription') {
      if (!SUBSCRIPTION_PROVIDERS.some((p) => p.id === input.provider)) {
        throw new Error(`Studio cannot use a ${input.provider} subscription`)
      }
      choice = { kind: 'subscription', provider: input.provider }
    } else {
      choice = { kind: 'fabric' }
    }
    await mkdir(this.home, { recursive: true })
    await writeFile(this.choicePath, JSON.stringify({ choice }, null, 2) + '\n')
    return choice
  }

  async clear() {
    await mkdir(this.home, { recursive: true })
    await writeFile(this.choicePath, JSON.stringify({ choice: null }, null, 2) + '\n')
  }

  async env(): Promise<Record<string, string>> {
    const choice = await this.choice()
    if (!choice) return {}
    if (choice.kind === 'fabric') return { PIKKU_STUDIO_AI: 'fabric' }
    if (choice.kind === 'subscription') {
      return { PIKKU_STUDIO_AI: 'subscription', PIKKU_STUDIO_AI_PROVIDER: choice.provider }
    }
    const provider = KEY_PROVIDERS.find((p) => p.id === choice.provider)!
    const apiKey = (await this.keys())[provider.id]
    if (!apiKey) return {}
    return {
      PIKKU_STUDIO_AI: 'key',
      PIKKU_STUDIO_AI_PROVIDER: provider.id,
      PIKKU_STUDIO_AI_KEY: apiKey,
      PIKKU_STUDIO_AI_BASE_URL: choice.baseUrl ?? provider.baseUrl,
      PIKKU_STUDIO_MODEL: choice.model,
      [provider.envVar]: apiKey,
    }
  }
}
