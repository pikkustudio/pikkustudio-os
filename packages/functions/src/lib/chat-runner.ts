import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { VercelAgentRunner } from '@pikku/ai-vercel'

type ChatAi = {
  chatConfig(): { baseUrl: string; apiKey: string; model: string; provider: string } | null
  usesCloud(): boolean
}

type Access = () => Promise<{ proxyUrl: string; apiKey: string }>

// The account's proxy takes the token per request, so it is read on every call and a sign-in takes effect at once.
const accountFetch = (access: Access) => (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  const { proxyUrl, apiKey } = await access()
  const from = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${apiKey}`)
  const base = proxyUrl.replace(/\/+$/, '')
  const path = base.endsWith('/v1') ? from.pathname.replace(/^\/v1/, '') : from.pathname
  return fetch(`${base}${path}${from.search}`, { ...init, headers })
}) as typeof fetch

export const studioAgentRunner = (ai: ChatAi, access: Access, accountModel?: string) =>
  new VercelAgentRunner({
    studio: () => {
      if (ai.usesCloud()) {
        const model = process.env.PIKKU_STUDIO_MODEL ?? accountModel
        if (!model) throw new Error('The account AI does not name a model; set PIKKU_STUDIO_MODEL.')
        return createOpenAICompatible({ name: 'account', baseURL: 'http://account.invalid/v1', apiKey: 'account', fetch: accountFetch(access) }).chatModel(model)
      }
      const config = ai.chatConfig()
      if (!config) throw new Error('Choose an AI with a key first. A subscription only works for building.')
      return createOpenAICompatible({ name: config.provider, baseURL: config.baseUrl, apiKey: config.apiKey }).chatModel(config.model)
    },
  })
