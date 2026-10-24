import { asI18n, type I18nString } from '@pikku/react'
import { useContext, useState } from 'react'
import { MousePointer2 } from 'lucide-react'
import { m } from '@/i18n/messages'
import { ShellCtx } from '../lib/shell'
import { Button } from '../ui/button'
import { ElementPanel } from './ElementPanel'
import { ErrorState, detailsOf, faultOf } from './ErrorState'
import { FixNotice } from './FixNotice'
import { PikkuDot } from './PikkuDot'
import { olderPikku, useSaveLook } from './liveSave'
import { HintRow } from './HintRow'
import { StatusLine } from './StatusLine'
import type { PickedElement } from './LiveAppFrame'
import type { Kind, Selection, Styles } from '../types/designTypes'

const kindOf = (tag: string): Kind => (tag === 'button' || tag === 'a' ? 'button' : /^h[1-6]$/.test(tag) ? 'heading' : ['p', 'span', 'label', 'li', 'small', 'strong', 'em'].includes(tag) ? 'text' : 'card')

const propLabel = (): Record<string, () => I18nString> => ({
  background: m.element_panel__fill_colour,
  color: m.element_panel__text_colour,
  fontSize: m.element_panel__text_size,
  fontWeight: m.element_panel__weight,
  padding: m.element_panel__space_inside,
  width: m.element_panel__size,
  textAlign: m.element_panel__alignment,
  borderRadius: m.element_panel__corner_roundness,
  borderWidth: m.element_panel__border_thickness,
  borderColor: m.element_panel__border_colour,
})

export const pickedName = (picked: PickedElement): I18nString => {
  const text = picked.text ? `“${picked.text}”` : picked.component
  return asI18n(text)
}

export function LiveLookPanel({ picked, styles, onStyles, onRetry }: { picked: PickedElement | null; styles: Styles; onStyles: (next: Styles) => void; onRetry: () => void }) {
  const { say } = useContext(ShellCtx)
  const [sent, setSent] = useState(false)
  const save = useSaveLook()
  if (!picked) return <HintRow icon={MousePointer2}>{m.design_workbench__click_anything_in_the()}</HintRow>
  if (!picked.look) return <ErrorState error={new Error('The preview sent the picked part without its look. It is running an older Studio picker; restarting the app loads the new one.')} what={m.live_look__what()} onRetry={onRetry} />
  const kind = kindOf(picked.tag)
  const selection: Selection = { id: picked.omId, kind, name: picked.component, count: picked.count, base: picked.look }
  const set = (prop: string, raw: string) => {
    const extra: Styles = prop === 'borderWidth' ? { borderStyle: 'solid' } : prop === 'width' && raw !== 'auto' && kind !== 'button' ? { display: 'block' } : {}
    const value = prop === 'padding' && kind === 'button' ? `${parseInt(raw)}px ${Math.round(parseInt(raw) * 1.8)}px` : raw
    setSent(false)
    save.reset()
    onStyles({ ...styles, [prop]: value, ...extra })
  }
  const labels = propLabel()
  const changes = Object.entries(styles)
    .filter(([prop]) => labels[prop])
    .map(([prop, value]) => `${labels[prop]!()} ${value}`)
    .join('; ')
  const tokens = Object.entries(picked.tokens)
    .filter(([, token]) => token)
    .map(([prop, token]) => `${labels[prop]?.() ?? prop}: --${token}`)
    .join(', ')
  const request = m.live_look__keep_say({ thing: pickedName(picked), changes: asI18n(changes), where: asI18n(tokens ? `${picked.omId} (${tokens})` : picked.omId) })
  const keep = () => {
    say(request)
    setSent(true)
  }
  const store = () => save.mutate({ picked, styles })
  return (
    <>
      <ElementPanel mode="component" selection={selection} styles={styles} ownCount={0} onSet={set} onReset={() => { save.reset(); onStyles({}) }} />
      {save.isError ? (
        <FixNotice
          title={m.action_notice__title()}
          body={olderPikku(save.error) ? m.live_save__old_pikku() : m.live_save__failed()}
          ask={olderPikku(save.error) ? request : m.error_state__fix_ask_what({ what: m.live_look__saving_what(), details: asI18n(detailsOf(faultOf(save.error), m.live_look__saving_what())) })}
          onRetry={store}
          retrying={save.isPending}
        />
      ) : null}
      {save.isSuccess ? <StatusLine tone="ok" text={m.live_look__saved()} /> : sent ? <StatusLine tone="ok" text={m.live_look__sent()} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="default" size="compact" type="button" disabled={!changes || save.isPending || save.isSuccess} aria-busy={save.isPending} onClick={store}>
          {save.isPending ? m.live_save__saving() : m.live_look__save()}
        </Button>
        <Button variant="bordered" size="compact" type="button" disabled={!changes || sent} onClick={keep}>
          <PikkuDot />
          {m.live_look__keep()}
        </Button>
      </div>
    </>
  )
}
