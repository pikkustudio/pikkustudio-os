import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { HintNote } from './HintNote'
import type { Translations } from '../types/designTypes'

const langs: Array<['en' | 'de' | 'ar', string, boolean]> = [['en', 'English', false], ['de', 'Deutsch', false], ['ar', 'العربية', true]]

export function TranslationPanel({ entry, onEdit }: { entry: Translations[string]; onEdit: (lang: 'en' | 'de' | 'ar', value: string) => void }) {
  return (
    <>
      <HintNote>{m.translation_panel__you_are_editing_wording()}</HintNote>
      {langs.map(([code, name, rtl]) => (
        <label key={code} className="flex flex-col gap-1">
          <span className="text-px13 font-bold text-muted-foreground">
            {name}
            {entry[code] ? '' : m.translation_panel__needs_translating()}
          </span>
          <Textarea tone="field" rows={2} dir={rtl ? 'rtl' : undefined} value={entry[code]} onChange={(e) => onEdit(code, e.target.value)} />
        </label>
      ))}
      <Button variant="bordered" size="compact" type="button" className="self-start">
        
        {m.translation_panel__see_all_wording()}
      </Button>
    </>
  )
}
