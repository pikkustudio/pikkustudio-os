import type { I18nString } from '@pikku/react'

export type Note = {
  id: string
  sec: string
  t: I18nString
  sum: string
  body: string[]
  links: string[]
  det: { kind: string; status: string; updated: string }
  plan?: { step: number; done: number; total: number }
}

