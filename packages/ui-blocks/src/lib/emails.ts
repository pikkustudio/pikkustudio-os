import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useProjectQuery } from './projectRpc'
import type { EmailsData, EmailTemplate } from '../types/emails'

type TemplateMeta = { variables?: string[]; locales?: Record<string, unknown> }
type Meta = { emailsMeta?: { templates?: Record<string, TemplateMeta> } }
export type EmailPreviewData = { name: string; locale: string; subject: string; html: string; text?: string; source: string; variables: string[]; missing: string[] }

const nice = (s: string) => s.replace(/[-_.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, (c) => c.toUpperCase())
const SAMPLE: Record<string, string> = { userName: 'Sam', name: 'Sam', link: 'https://example.com/go/4f9a', url: 'https://example.com/go/4f9a', code: '482 913' }
const ACCOUNT = /invit|magic|reset|sign|welcome|verif|confirm|password|login/i

export function useEmails(key: string) {
  const meta = useProjectQuery<Meta>(key, 'console:getAllMeta')
  const templates = meta.data?.emailsMeta?.templates ?? {}
  const none: string = ''
  const emails: EmailTemplate[] = Object.entries(templates).map(([id, t]) => {
    const name = nice(id)
    return {
    id,
    group: ACCOUNT.test(id) ? 'A' : 'B',
    name: asI18n(name),
    when: asI18n(none),
    to: asI18n(none),
    ph: t.variables ?? [],
    locales: Object.keys(t.locales ?? {}),
    }
  })
  const codes = [...new Set(emails.flatMap((e) => e.locales))]
  const names = new Intl.DisplayNames(['en'], { type: 'language' })
  const vars = [...new Set(emails.flatMap((e) => e.ph))]
  const data: EmailsData = {
    langs: Object.fromEntries(codes.map((c) => { const language = names.of(c) ?? c; return [c, asI18n(language)] })),
    short: Object.fromEntries(codes.map((c) => { const up = c.toUpperCase(); return [c, asI18n(up)] })),
    fields: Object.fromEntries(vars.map((v) => { const token = `{{ ${v} }}`; const label = nice(v); return [v, { token: asI18n(token), about: m.emails__filled_in(), label: asI18n(label), start: SAMPLE[v] ?? '' }] })),
    emails,
  }
  return { query: meta, data }
}

export const useEmailPreview = (key: string, templateName: string, locale: string, data: Record<string, string>) =>
  useProjectQuery<EmailPreviewData>(key, 'console:renderEmailPreview', { templateName, locale, data })
