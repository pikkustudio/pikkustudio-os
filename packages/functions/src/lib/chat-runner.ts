import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { VercelAgentRunner } from '@pikku/ai-vercel'

type ChatAi = {
  chatConfig(): { baseUrl: string; apiKey: string; model: string; provider: string } | null
}

export const studioAgentRunner = (ai: ChatAi) =>
  new VercelAgentRunner({
    studio: () => {
      const config = ai.chatConfig()
      if (!config) throw new Error('Choose an AI with a key first. A subscription only works for building.')
      return createOpenAICompatible({ name: config.provider, baseURL: config.baseUrl, apiKey: config.apiKey }).chatModel(config.model)
    },
  })
