import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { ColorField } from './ColorField'
import { HintNote } from './HintNote'
import { RangeField } from './RangeField'
import { SegmentField } from './SegmentField'
import type { Mode, Selection, Styles } from '../types/designTypes'

const kindNames = () => ({
  button: { one: m.element_panel__this_button(), many: m.element_panel__all_buttons(), count: (count: number) => m.element_panel__n_button({ count }) },
  heading: { one: m.element_panel__this_heading(), many: m.element_panel__all_headings(), count: (count: number) => m.element_panel__n_heading({ count }) },
  text: { one: m.element_panel__this_text(), many: m.element_panel__all_texts(), count: (count: number) => m.element_panel__n_text({ count }) },
  card: { one: m.element_panel__this_card(), many: m.element_panel__all_cards(), count: (count: number) => m.element_panel__n_card({ count }) },
})

export function ElementPanel({ mode, selection, styles, ownCount, onSet, onReset }: { mode: 'element' | 'component'; selection: Selection; styles: Styles; ownCount: number; onSet: (prop: string, value: string) => void; onReset: () => void }) {
  const label = kindNames()[selection.kind]
  const b = selection.base
  const num = (prop: string, fallback: number) => (styles[prop] !== undefined ? parseInt(styles[prop]) : fallback)
  const fw = Number(styles.fontWeight ?? b.fontWeight)
  const range = (prop: string, text: I18nString, min: number, max: number, fallback: number) => (
    <RangeField label={text} min={min} max={max} value={num(prop, fallback)} unit="px" onChange={(v) => onSet(prop, `${v}px`)} />
  )
  return (
    <>
      <HintNote>
        {mode === 'element'
          ? m.element_panel__only_this({ kind: label.one, kinds: label.many })
            : m.element_panel__changes_all({ things: label.count(selection.count), note: ownCount ? m.element_panel__own_settings_kept({ count: ownCount }) : m.element_panel__single_one_wins() })}
      </HintNote>
      <div className="flex flex-col gap-3.5">
        <ColorField label={m.element_panel__fill_colour()} value={styles.background ?? b.background} onChange={(v) => onSet('background', v)} />
        <ColorField label={m.element_panel__text_colour()} value={styles.color ?? b.color} onChange={(v) => onSet('color', v)} />
        {range('fontSize', m.element_panel__text_size(), 12, 64, b.fontSize)}
        <SegmentField label={m.element_panel__weight()} value={String(fw >= 700 ? 800 : fw >= 500 ? 600 : 400)} onChange={(v) => onSet('fontWeight', v)} options={[['400', m.element_panel__light()], ['600', m.element_panel__medium()], ['800', m.element_panel__bold()]]} />
        {range('padding', m.element_panel__space_inside(), 0, 48, b.padding)}
        <SegmentField label={m.element_panel__size()} value={styles.width ?? 'auto'} onChange={(v) => onSet('width', v)} options={[['auto', m.element_panel__fit()], ['70%', m.element_panel__wide()], ['100%', m.element_panel__full_width()]]} />
        <SegmentField label={m.element_panel__alignment()} value={styles.textAlign ?? b.textAlign} onChange={(v) => onSet('textAlign', v)} options={[['left', m.element_panel__left()], ['center', m.element_panel__centre()], ['right', m.element_panel__right()]]} />
        {range('borderRadius', m.element_panel__corner_roundness(), 0, 40, b.borderRadius)}
        {range('borderWidth', m.element_panel__border_thickness(), 0, 6, b.borderWidth)}
        <ColorField label={m.element_panel__border_colour()} value={styles.borderColor ?? b.borderColor} onChange={(v) => onSet('borderColor', v)} />
      </div>
      <Button variant="ghost" size="textTight" type="button" className="self-start" onClick={onReset}>
        {mode === 'element' ? m.element_panel__undo_changes_to_this() : m.element_panel__undo_changes_to_all()}
      </Button>
    </>
  )
}
