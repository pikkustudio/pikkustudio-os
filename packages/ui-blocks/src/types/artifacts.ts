import { asI18n, type I18nString } from '@pikku/react'
export type Artifact = {
  id: string
  kind: 'Design' | 'Page' | 'Document'
  title: string
  summary: string
  device?: 'computer' | 'phone'
  exploration?: string
  mode?: 'extreme' | 'controlled'
  chosen?: boolean
  at: number
  html?: string
  text?: string
}

export const artifactWhen = (at: number): I18nString => {
  const when = new Date(at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return asI18n(when)
}
