import { m } from '@/i18n/messages'
import { Info } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { HintNote } from './HintNote'
import { InspectorSection } from './InspectorSection'
import type { Copy, EmailsData, EmailTemplate, Field, Lang } from '../types/emails'

export function EmailPanel({ email, fields, langs, lang, copy, vals, onCopy, onVal, onReset }: { email: EmailTemplate; fields: EmailsData['fields']; langs: EmailsData['langs']; lang: Lang; copy: Copy; vals: Record<Field, string>; onCopy: (c: Copy) => void; onVal: (k: Field, v: string) => void; onReset: () => void }) {
  const dir = lang === 'ar' ? 'rtl' : undefined
  return (
    <Card variant="inspector" role="complementary" aria-label={m.email_panel__email_controls()}>
      <div className="flex flex-col gap-1 border-b border-border px-4 py-3.5">
        <h2 className="text-[19px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{email.name}</h2>
        <p className="text-px13 text-muted-foreground">{email.group === 'A' ? m.email_panel__account_email() : m.email_panel__other_email()}</p>
      </div>
      <div className="flex flex-1 flex-col gap-4.5 overflow-auto px-4 pt-3.5 pb-5">
        <HintNote>
          <span className="inline-flex items-center gap-2">
            <Info className="size-4 shrink-0" />
            
            {m.email_panel__a_sample_with_made_up()}
          </span>
        </HintNote>
        <InspectorSection title={`What this email says · ${langs[lang]}`}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-px13 font-bold text-muted-foreground">{m.email_panel__subject_line()}</span>
              <Input shape="field" dir={dir} value={copy.s} readOnly />
            </label>
            {copy.b.map((p, i) => (
              <label key={i} className="flex flex-col gap-1">
                <span className="text-px13 font-bold text-muted-foreground">{m.email_panel__paragraph({ n: i + 1 })}</span>
                <Textarea tone="field" rows={4} dir={dir} value={p} onChange={(e) => onCopy({ ...copy, b: copy.b.map((x, j) => (j === i ? e.target.value : x)) })} />
              </label>
            ))}
            {copy.c ? (<label className="flex flex-col gap-1">
              <span className="text-px13 font-bold text-muted-foreground">{m.email_panel__button_wording()}</span>
              <Input shape="field" dir={dir} value={copy.c} onChange={(e) => onCopy({ ...copy, c: e.target.value })} />
            </label>) : null}
          </div>
        </InspectorSection>
        {email.when ? (<InspectorSection title={m.email_panel__when_it_is_sent()}>
          <div className="flex flex-col gap-2.5 rounded-xl bg-secondary px-3.5 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-px13 font-bold text-muted-foreground">{m.email_panel__who_gets_it()}</span>
              <b className="text-px15 font-semibold">{email.to}</b>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-px13 font-bold text-muted-foreground">{m.email_panel__sent()}</span>
              <b className="text-px15 font-semibold">{email.when}</b>
            </div>
          </div>
        </InspectorSection>) : null}
        <InspectorSection title={m.email_panel__details_that_change_for()}>
          <ul className="flex flex-col gap-2">
            {email.ph.map((k) => (
              <li key={k} className="grid grid-cols-[auto_1fr] items-baseline gap-2.5 text-px14 text-ink-2">
                <code className="rounded-sm bg-accent px-2 py-0.5 font-mono text-[13px] leading-[normal] font-bold text-accent-foreground">{fields[k]?.token}</code>
                <span>{fields[k]?.about}</span>
              </li>
            ))}
          </ul>
        </InspectorSection>
        <InspectorSection>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-px14 font-bold tracking-normal text-muted-foreground">{m.email_panel__sample_details()}</h3>
            <Button variant="soft" size="compactTight" type="button" onClick={onReset}>
              
              {m.email_panel__reset()}
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {email.ph.map((k) => (
              <label key={k} className="flex flex-col gap-1">
                <span className="text-px13 font-bold text-muted-foreground">{fields[k]?.label}</span>
                <Input shape="field" value={vals[k]} onChange={(e) => onVal(k, e.target.value)} />
              </label>
            ))}
          </div>
        </InspectorSection>
      </div>
    </Card>
  )
}
