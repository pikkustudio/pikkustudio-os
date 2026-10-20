import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/function'
import { modelTranslate } from '../../lib/translate.js'

export const TranslateTextsInput = z.object({
  texts: z.record(z.string(), z.string()),
  locale: z.string(),
  sourceLocale: z.string().default('en'),
})

export const TranslateTextsOutput = z.object({ translations: z.record(z.string(), z.string()) })

export const translateTexts = pikkuSessionlessFunc({
  description: "Translate an app's texts with the AI Studio builds with. Texts it could not translate are left out.",
  input: TranslateTextsInput,
  output: TranslateTextsOutput,
  func: async ({ studio }, { texts, locale, sourceLocale }, { http }) => {
    const translate = modelTranslate(async () => {
      const env = await studio.ai.env()
      if (env.PIKKU_STUDIO_AI === 'key') {
        return { url: env.PIKKU_STUDIO_AI_BASE_URL!, key: env.PIKKU_STUDIO_AI_KEY!, model: env.PIKKU_STUDIO_MODEL! }
      }
      const source = env.PIKKU_STUDIO_AI === 'source' ? env.PIKKU_STUDIO_AI_SOURCE : undefined
      const model = env.PIKKU_STUDIO_MODEL ?? studio.projects.accountModel(source)
      if (source && model) {
        const { proxyUrl, apiKey } = await studio.projects.modelAccess(http?.request?.header('x-studio-locale') ?? undefined, source)
        return { url: proxyUrl, key: apiKey, model }
      }
      return null
    })
    return { translations: await translate(texts, locale, sourceLocale) }
  },
})
