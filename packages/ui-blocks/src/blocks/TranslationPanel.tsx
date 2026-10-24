import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { getLocale } from '@/paraglide/runtime.js'
import { Textarea } from '../ui/textarea'
import { HintNote } from './HintNote'

const RTL = new Set(['ar', 'he', 'fa', 'ur'])

export const languageName = (code: string) => {
  const text = new Intl.DisplayNames([getLocale()], { type: 'language' }).of(code) ?? code
  return asI18n(text)
}

export function TranslationPanel({ locales, entry, onEdit }: { locales: string[]; entry: Record<string, string>; onEdit: (locale: string, value: string) => void }) {
  return (
    <>
      <HintNote>{m.translation_panel__you_are_editing_wording()}</HintNote>
      {locales.map((code) => (
        <label key={code} className="flex flex-col gap-1">
          <span className="text-px13 font-bold text-muted-foreground">
            {languageName(code)}
            {entry[code] ? null : m.translation_panel__needs_translating()}
          </span>
          <Textarea tone="field" rows={2} dir={RTL.has(code.split('-')[0]) ? 'rtl' : undefined} value={entry[code] ?? ''} onChange={(e) => onEdit(code, e.target.value)} />
        </label>
      ))}
    </>
  )
}
