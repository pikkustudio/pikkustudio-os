import { m } from '@/i18n/messages'
import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useSetAi } from '../lib/onboarding'

const field = 'font-heading text-[16px] font-semibold'

export const providers = [
  ['OpenAI', 'openai'],
  ['Claude', 'anthropic'],
  ['Gemini', 'gemini'],
  ['Grok', 'xai'],
  ['Mistral', 'mistral'],
  ['DeepSeek', 'deepseek'],
  ['Groq', 'groq'],
  ['OpenRouter', 'openrouter'],
] as const

const LITELLM_COMMAND = 'litellm --model'

export function AiLitellmPanel({ intro, via, onDone, onBack }: { intro: React.ReactNode; via?: string; onDone: () => void; onBack: () => void }) {
  const save = useSetAi()
  const [baseUrl, setBaseUrl] = useState('http://localhost:4000')
  const [apiKey, setApiKey] = useState('')
  const ready = baseUrl.trim().length > 0 && !save.isPending
  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) save.mutate({ kind: 'key', provider: 'litellm', apiKey: apiKey.trim(), baseUrl: baseUrl.trim() }, { onSuccess: onDone })
      }}
    >
      <div className="grid shrink-0 grid-cols-[auto_1fr] items-start gap-3 rounded-[18px] bg-secondary p-4">
        {intro}
        <p className="font-heading text-[17px] leading-[1.4] text-pretty">{m.ai_connect_panels__lite_llm_is_a_small()}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 rounded-[18px] border border-border p-4">
        <b className="text-[16px]">{m.ai_connect_panels__do_not_have_it()}</b>
        <code className="rounded-lg bg-secondary px-3 py-2 text-[14px] break-all">{m.ai_connect_panels__pip_install_litellm_proxy()}</code>
        <code className="rounded-lg bg-secondary px-3 py-2 text-[14px] break-all">{LITELLM_COMMAND} {via ? `${via}/…` : m.ai_connect_panels__openai_gpt_4_1()}</code>
        <a className="inline-flex items-center gap-1 text-[14px] font-semibold text-accent-foreground underline" href="https://docs.litellm.ai/docs/simple_proxy" target="_blank" rel="noreferrer">
          
          {m.ai_connect_panels__read_the_lite_llm_guide()} <ArrowUpRight className="size-4" />
        </a>
      </div>
      <label htmlFor="ll-url" className={field}>{m.ai_connect_panels__its_address()}</label>
      <Input id="ll-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} inputMode="url" />
      <label htmlFor="ll-key" className={field}>
        
        {m.ai_connect_panels__its_key()} <span className="font-normal text-muted-foreground">{m.ai_connect_panels__optional()}</span>
      </label>
      <Input id="ll-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
      {save.isError ? (
        <p role="alert" className="text-[15px] font-semibold">{m.ai_connect_panels__that_could_not_be()}</p>
      ) : null}
      <Button variant="default" size="pageLg" type="submit" disabled={!ready}>
        {save.isPending ? m.ai_connect_panels__saving() : m.ai_connect_panels__use_my_lite_llm()}
      </Button>
      <Button variant="ghost" size="page" type="button" onClick={onBack}>
        
        {m.ai_connect_panels__back()}
      </Button>
    </form>
  )
}

export function AiProviderPanel({ provider, onDone, onBack }: { provider: string; onDone: () => void; onBack: () => void }) {
  const save = useSetAi()
  const [apiKey, setApiKey] = useState('')
  const ready = apiKey.trim().length > 0 && !save.isPending
  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) save.mutate({ kind: 'key', provider, apiKey: apiKey.trim() }, { onSuccess: onDone })
      }}
    >
      <label htmlFor="pv-key" className={field}>Token or secret</label>
      <Input id="pv-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
      {save.isError ? <p role="alert" className="text-[15px] font-semibold">{m.ai_connect_panels__that_could_not_be()}</p> : null}
      <Button variant="default" size="pageLg" type="submit" disabled={!ready}>
        {save.isPending ? m.ai_connect_panels__saving() : 'Use this provider'}
      </Button>
      <Button variant="ghost" size="page" type="button" onClick={onBack}>{m.ai_connect_panels__back()}</Button>
    </form>
  )
}
