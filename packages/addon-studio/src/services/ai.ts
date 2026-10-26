import type { Kysely } from 'kysely'

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
  { id: 'deepseek', name: 'DeepSeek', envVar: 'DEEPSEEK_API_KEY', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-flash' },
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
  /** The AI of a contributed source's account, by the source's namespace. */
  | { kind: 'source'; source: string }

export type AiInput =
  | { kind: 'key'; provider: string; apiKey: string; model?: string; baseUrl?: string }
  | { kind: 'subscription'; provider: string }
  | { kind: 'source'; source: string }

/**
 * Where a person's own provider key lives: the host's secret store (the vault locally).
 * Studio never writes a key to a file of its own; the choice (never the key) lives in Studio's database.
 */
export interface AiSecretStore {
  has(name: string): Promise<boolean>
  get(name: string): Promise<string>
  set(name: string, value: string): Promise<void>
}

/** Where the person's AI choice is kept: Studio's database on a host that has one. */
export interface AiChoiceStore {
  get(): Promise<AiChoice | null>
  set(choice: AiChoice | null): Promise<void>
}

export const memoryAiChoiceStore = (): AiChoiceStore => {
  let held: AiChoice | null = null
  return { get: async () => held, set: async (choice) => void (held = choice) }
}

/** The choice as one row of `studio_setting` (key `ai`, value JSON). */
export const kyselyAiChoiceStore = (db: Kysely<any>): AiChoiceStore => ({
  async get() {
    const row = await db.selectFrom('studio_setting').select('value').where('key', '=', 'ai').executeTakeFirst()
    return row ? (JSON.parse(row.value as string) as AiChoice | null) : null
  },
  async set(choice) {
    if (!choice) {
      await db.deleteFrom('studio_setting').where('key', '=', 'ai').execute()
      return
    }
    const value = JSON.stringify(choice)
    await db.insertInto('studio_setting').values({ key: 'ai', value }).onConflict((oc) => oc.column('key').doUpdateSet({ value })).execute()
  },
})

/** The secret a provider's key is kept under. */
export const aiSecretName = (provider: string) => `AI_${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`

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
  private current: AiChoice | null = null
  private loaded: Promise<void> | undefined

  constructor(private secrets?: AiSecretStore, private store: AiChoiceStore = memoryAiChoiceStore()) {}

  /** Reads the saved choice once; `usesSource` and `chatTarget` answer from this copy. Call before serving. */
  load(): Promise<void> {
    return (this.loaded ??= this.store.get().then((choice) => void (this.current = choice)))
  }

  async choice(): Promise<AiChoice | null> {
    await this.load()
    return this.current
  }

  /** The person's key for a provider, from the secret store; undefined when none is set. Never written to disk by Studio. */
  private async keyFor(provider: string): Promise<string | undefined> {
    const name = aiSecretName(provider)
    if (!this.secrets || !(await this.secrets.has(name))) return undefined
    return (await this.secrets.get(name)) || undefined
  }

  /** Whether a key is set for a provider; the key itself is never handed to the UI. */
  async hasKey(provider: string): Promise<boolean> {
    return (await this.keyFor(provider)) !== undefined
  }

  /** The source whose account AI was chosen, or null when the AI is a key or subscription of the person's own. */
  usesSource(): string | null {
    const choice = this.current
    return choice?.kind === 'source' ? choice.source : null
  }

  /** Where chat goes for a key choice. The key is read per request by `chatKey`, so it is never held here. */
  chatTarget(): { baseUrl: string; model: string; provider: string } | null {
    const choice = this.current
    if (choice?.kind !== 'key') return null
    const provider = KEY_PROVIDERS.find((p) => p.id === choice.provider)
    if (!provider) return null
    const base = (choice.baseUrl ?? provider.baseUrl).replace(/\/$/, '')
    return {
      baseUrl: provider.id === 'litellm' && !base.endsWith('/v1') ? `${base}/v1` : base,
      model: choice.model,
      provider: provider.id,
    }
  }

  async chatKey(): Promise<string | undefined> {
    await this.load()
    const target = this.chatTarget()
    return target ? this.keyFor(target.provider) : undefined
  }

  async set(input: AiInput): Promise<AiChoice> {
    await this.load()
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
      if (!this.secrets) throw new Error('This host has no secret store to keep a key in. Set the key in your environment instead.')
      await this.secrets.set(aiSecretName(provider.id), apiKey)
      choice = { kind: 'key', provider: provider.id, model, ...(baseUrl ? { baseUrl } : {}) }
    } else if (input.kind === 'subscription') {
      if (!SUBSCRIPTION_PROVIDERS.some((p) => p.id === input.provider)) {
        throw new Error(`Studio cannot use a ${input.provider} subscription`)
      }
      choice = { kind: 'subscription', provider: input.provider }
    } else {
      choice = { kind: 'source', source: input.source }
    }
    await this.save(choice)
    return choice
  }

  async clear() {
    await this.save(null)
  }

  private async save(choice: AiChoice | null) {
    await this.load()
    await this.store.set(choice)
    this.current = choice
  }

  async env(): Promise<Record<string, string>> {
    const choice = await this.choice()
    if (!choice) return {}
    if (choice.kind === 'source') return { PIKKU_STUDIO_AI: 'source', PIKKU_STUDIO_AI_SOURCE: choice.source }
    if (choice.kind === 'subscription') {
      return { PIKKU_STUDIO_AI: 'subscription', PIKKU_STUDIO_AI_PROVIDER: choice.provider }
    }
    const provider = KEY_PROVIDERS.find((p) => p.id === choice.provider)!
    const apiKey = await this.keyFor(provider.id)
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
