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
  const emails: EmailTemplate[] = Object.entries(templates).map(([id, t]) => ({
    id,
    group: ACCOUNT.test(id) ? 'A' : 'B',
    name: nice(id),
    when: '',
    to: '',
    ph: t.variables ?? [],
    locales: Object.keys(t.locales ?? {}),
  }))
  const codes = [...new Set(emails.flatMap((e) => e.locales))]
  const names = new Intl.DisplayNames(['en'], { type: 'language' })
  const vars = [...new Set(emails.flatMap((e) => e.ph))]
  const data: EmailsData = {
    langs: Object.fromEntries(codes.map((c) => [c, names.of(c) ?? c])),
    short: Object.fromEntries(codes.map((c) => [c, c.toUpperCase()])),
    fields: Object.fromEntries(vars.map((v) => [v, { token: `{{ ${v} }}`, about: 'Filled in for each person', label: nice(v), start: SAMPLE[v] ?? '' }])),
    emails,
  }
  return { query: meta, data }
}

export const useEmailPreview = (key: string, templateName: string, locale: string, data: Record<string, string>) =>
  useProjectQuery<EmailPreviewData>(key, 'console:renderEmailPreview', { templateName, locale, data })
