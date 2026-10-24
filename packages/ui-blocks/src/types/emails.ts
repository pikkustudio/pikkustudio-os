import type { I18nString } from '@pikku/react'
export type Lang = string
export type Field = string
export type Copy = { s: string; b: string[]; c: string }
export type EmailTemplate = { id: string; group: 'A' | 'B'; name: I18nString; when: I18nString; to: I18nString; ph: Field[]; locales: Lang[] }

export type EmailsData = {
  langs: Record<Lang, I18nString>
  short: Record<Lang, I18nString>
  fields: Record<Field, { token: I18nString; about: I18nString; label: I18nString; start: string }>
  emails: EmailTemplate[]
}
