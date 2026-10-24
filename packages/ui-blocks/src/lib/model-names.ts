import { asI18n, type I18nString } from '@pikku/react'

const WORDS: Record<string, string> = { gpt: 'GPT', deepseek: 'DeepSeek', openai: 'OpenAI', xai: 'xAI', glm: 'GLM', qwen: 'Qwen', llama: 'Llama', ai: 'AI' }

export const friendlyModel = (id: string): I18nString =>
  asI18n(
    id
      .replace(/^.*[/:]/, '')
      .replace(/-\d{8}$/, '')
      .split(/[-_\s]+/)
      .filter(Boolean)
      .reduce<string[]>((out, w) => (/^\d+$/.test(w) && /^\d+$/.test(out[out.length - 1] ?? '') ? [...out.slice(0, -1), `${out[out.length - 1]}.${w}`] : [...out, w]), [])
      .map((w) => WORDS[w.toLowerCase()] ?? (/^v\d/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' '),
  )
