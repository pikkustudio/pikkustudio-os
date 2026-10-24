import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { ToggleLeft, ToggleRight, TriangleAlert } from 'lucide-react'
import { Button } from '../ui/button'
import { Switch as Toggle } from '../ui/switch'
import { Dot, RowCard } from './RowCard'
import { needsLook, switchState, switchTitle, type Switch } from '../lib/switches'

export const switchWords = (s: Switch): { tone: 'ok' | 'warn' | 'quiet'; text: I18nString } => {
  switch (switchState(s)) {
    case 'off':
      return { tone: 'quiet', text: m.switches_row__off() }
    case 'everyone':
      return { tone: 'ok', text: m.switches_row__on_everyone() }
    case 'some':
      return { tone: 'ok', text: m.switches_row__on_some({ percent: s.rolloutPercent ?? 0 }) }
    case 'unset':
      return { tone: 'warn', text: m.switches_row__unset() }
    case 'unused':
      return { tone: 'quiet', text: m.switches_row__unused() }
  }
}

export function SwitchRow({ item, canChange, busy, onToggle, onOpen }: { item: Switch; canChange: boolean; busy: boolean; onToggle: (enabled: boolean) => void; onOpen: () => void }) {
  const words = switchWords(item)
  const look = needsLook(item)
  const title = asI18n(switchTitle(item.name))
  return (
    <RowCard
      flag={look}
      on={item.enabled && !look}
      tile={look ? <TriangleAlert className="size-5.5" /> : item.enabled ? <ToggleRight className="size-5.5" /> : <ToggleLeft className="size-5.5" />}
      title={title}
      caption={item.description ? asI18n(item.description) : undefined}
    >
      <Dot tone={words.tone}>{words.text}</Dot>
      {item.declared ? (
        <Toggle checked={item.enabled} disabled={!canChange || busy} aria-busy={busy} aria-label={m.switches_row__toggle({ name: title })} onCheckedChange={onToggle} />
      ) : null}
      <Button type="button" variant="bordered" size="compact" onClick={onOpen}>
        {m.switches_row__open()}
      </Button>
    </RowCard>
  )
}
