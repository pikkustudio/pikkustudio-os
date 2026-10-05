export type Lang = string
export type Field = string
export type Copy = { s: string; b: string[]; c: string }
export type EmailTemplate = { id: string; group: 'A' | 'B'; name: string; when: string; to: string; ph: Field[]; locales: Lang[] }

export type EmailsData = {
  langs: Record<Lang, string>
  short: Record<Lang, string>
  fields: Record<Field, { token: string; about: string; label: string; start: string }>
  emails: EmailTemplate[]
}
