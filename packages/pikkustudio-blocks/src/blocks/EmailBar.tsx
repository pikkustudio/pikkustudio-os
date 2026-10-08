import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { ArrowLeft, FileText, Mail, Monitor, RotateCw, Send, Smartphone } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import type { Device } from './EmailPreview'
import { PageBreadcrumb } from './PageBreadcrumb'
import { Segmented } from './Segmented'
import type { Lang } from '../types/emails'

export function EmailBar({
  id,
  emails,
  device,
  lang,
  langs,
  missing,
  onPick,
  onBack,
  onDevice,
  onLang,
  onReload,
}: {
  id: string
  emails: { id: string; name: string; when: string }[]
  device: Device
  lang: Lang
  langs: Record<Lang, I18nString>
  missing: Lang[]
  onPick: (id: string) => void
  onBack: () => void
  onDevice: (d: Device) => void
  onLang: (l: Lang) => void
  onReload: () => void
}) {
  return (
    <Card variant="bar" role="toolbar" aria-label={m.email_bar__email_preview_controls()}>
      <div className="@container/bar w-full">
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 @min-[1100px]/bar:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-2">
            <Button variant="bar" size="picker" type="button" aria-label={m.email_bar__back_to_all_emails()} title={m.email_bar__back_to_all_emails()} onClick={onBack}>
              <ArrowLeft className="rtl:-scale-x-100 size-4.5" />
              <span className="hidden @min-[1100px]/bar:inline">{m.email_bar__all_emails()}</span>
            </Button>
            <Segmented label={m.email_bar__show_as()} value={device} onChange={(v) => onDevice(v as Device)} options={[['computer', <Monitor key="c" className="size-4" />, false, m.email_bar__computer()], ['phone', <Smartphone key="p" className="size-4" />, false, m.email_bar__phone()], ['text', <FileText key="t" className="size-4" />, false, m.email_bar__plain_text()]]} />
            <Button variant="bar" size="bar" type="button" aria-label={m.email_bar__reload_preview()} title={m.email_bar__reload_preview()} onClick={onReload}>
              <RotateCw className="size-4.5" />
            </Button>
          </div>
          <div className="flex min-w-0 justify-center">
            <PageBreadcrumb
              kind="email"
              groups={[{ app: 'emails', label: m.email_bar__emails(), pages: emails.map((e) => ({ id: e.id, name: asI18n(e.name), text: asI18n(e.when) })) }]}
              app="emails"
              page={id}
              icon={
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground ring-1 ring-border" aria-hidden="true">
                  <Mail className="size-4.5" />
                </span>
              }
              onPick={(_, p) => onPick(p)}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Segmented label={m.email_bar__language()} value={lang} onChange={(l) => onLang(l as Lang)} options={Object.keys(langs).map((l) => [l, langs[l], missing.includes(l), langs[l]])} />
            <Button variant="bar" size="picker" type="button" aria-label={m.email_bar__send_me_a_test()} title={m.email_bar__send_me_a_test()}>
              <Send className="size-4.5" />
              <span className="hidden @min-[1100px]/bar:inline">{m.email_bar__send_me_a_test()}</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
