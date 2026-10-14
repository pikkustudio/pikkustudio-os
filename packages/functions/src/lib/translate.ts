export type Translate = (
  messages: Record<string, string>,
  locale: string,
  sourceLocale: string
) => Promise<Record<string, string>>

export interface ModelAccess {
  url: string
  key: string
  model: string
}

const BATCH = 80

const prompt = (messages: Record<string, string>, locale: string, sourceLocale: string) =>
  [
    `Translate the values of this JSON object from ${sourceLocale} to ${locale}.`,
    'Keep every key. Keep placeholders such as {name}, markup and line breaks exactly as they are.',
    'Answer with the translated JSON object only.',
    '',
    JSON.stringify(messages),
  ].join('\n')

const parseObject = (text: string): Record<string, unknown> => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) return {}
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return {}
  }
}

export const modelTranslate =
  (access: () => Promise<ModelAccess | null>, fetchImpl: typeof fetch = fetch): Translate =>
  async (messages, locale, sourceLocale) => {
    const model = await access()
    if (!model) return {}
    const keys = Object.keys(messages)
    const translations: Record<string, string> = {}
    for (let i = 0; i < keys.length; i += BATCH) {
      const batch = Object.fromEntries(keys.slice(i, i + BATCH).map((key) => [key, messages[key]!]))
      try {
        const response = await fetchImpl(`${model.url.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${model.key}` },
          body: JSON.stringify({
            model: model.model,
            messages: [{ role: 'user', content: prompt(batch, locale, sourceLocale) }],
          }),
        })
        if (!response.ok) continue
        const reply = (await response.json()) as { choices?: { message?: { content?: string } }[] }
        const parsed = parseObject(reply.choices?.[0]?.message?.content ?? '')
        for (const key of Object.keys(batch)) {
          const value = parsed[key]
          if (typeof value === 'string' && value.trim()) translations[key] = value
        }
      } catch {}
    }
    return translations
  }
