import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { useId, useState, type ReactNode } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Info } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import type { Selection, Styles } from '../types/designTypes'

const kindNames = () => ({
  button: { one: m.element_panel__this_button(), many: m.element_panel__all_buttons(), count: (count: number) => m.element_panel__n_button({ count }) },
  heading: { one: m.element_panel__this_heading(), many: m.element_panel__all_headings(), count: (count: number) => m.element_panel__n_heading({ count }) },
  text: { one: m.element_panel__this_text(), many: m.element_panel__all_texts(), count: (count: number) => m.element_panel__n_text({ count }) },
  card: { one: m.element_panel__this_card(), many: m.element_panel__all_cards(), count: (count: number) => m.element_panel__n_card({ count }) },
})

const control = 'h-9 rounded-lg border border-border bg-field'
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-card'
const labelText = 'text-px13 font-medium text-foreground'

function Section({ title, children }: { title: I18nString; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-px13 font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Note({ children }: { children: I18nNode }) {
  return (
    <p className="flex items-start gap-2 text-px13 leading-snug text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

function Colour({ label, value, onChange }: { label: I18nString; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className={labelText}>
        {label}
      </label>
      <div className={`${control} flex w-37 items-center gap-2 px-1.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 hover:border-muted-foreground`}>
        <span className="relative size-6 shrink-0 overflow-hidden rounded-md border border-border" style={{ background: value }}>
          <input
            type="color"
            value={value}
            aria-label={label}
            onChange={(e) => {
              setDraft(null)
              onChange(e.target.value)
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
        <input
          id={id}
          value={draft ?? value}
          aria-label={m.color_field__code_label({ label })}
          dir="ltr"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mono text-px13 text-foreground tabular-nums outline-none"
          onChange={(e) => {
            setDraft(e.target.value)
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value)
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
    </div>
  )
}

const px = asI18n(String('px'))

function Slider({ label, min, max, value, onChange }: { label: I18nString; min: number; max: number; value: number; onChange: (v: number) => void }) {
  const id = useId()
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelText}>
          {label}
        </label>
        <output htmlFor={id} className="text-px13 text-muted-foreground tabular-nums" dir="ltr">
          {value}
          {px}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ ['--fill' as string]: `${pct}%` }}
        className={`h-5 w-full cursor-pointer appearance-none bg-transparent ${focusRing} rounded-full
          [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--primary)_var(--fill),var(--border)_var(--fill))]
          [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-card [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110
          [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border [&::-moz-range-progress]:h-1 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-primary
          [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-card`}
      />
    </div>
  )
}

function Choice({ label, value, onChange, options }: { label: I18nString; value: string; onChange: (v: string) => void; options: Array<[string, I18nNode, I18nString?]> }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={labelText}>{label}</span>
      <div role="group" aria-label={label} className="grid h-9 gap-0.5 rounded-lg bg-secondary p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(([id, text, name]) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            aria-label={name}
            title={name}
            onClick={() => onChange(id)}
            className={`inline-flex items-center justify-center rounded-md px-2 text-px13 font-medium whitespace-nowrap transition-colors ${focusRing} ${value === id ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-ink-2 hover:text-foreground'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ElementPanel({ mode, selection, styles, ownCount, onSet, onReset }: { mode: 'element' | 'component'; selection: Selection; styles: Styles; ownCount: number; onSet: (prop: string, value: string) => void; onReset: () => void }) {
  const label = kindNames()[selection.kind]
  const b = selection.base
  const num = (prop: string, fallback: number) => (styles[prop] !== undefined ? parseInt(styles[prop]) : fallback)
  const fw = Number(styles.fontWeight ?? b.fontWeight)
  const range = (prop: string, text: I18nString, min: number, max: number, fallback: number) => (
    <Slider label={text} min={min} max={max} value={num(prop, fallback)} onChange={(v) => onSet(prop, `${v}px`)} />
  )
  return (
    <>
      <Note>
        {mode === 'element'
          ? m.element_panel__only_this({ kind: label.one, kinds: label.many })
          : m.element_panel__changes_all({ things: label.count(selection.count), note: ownCount ? m.element_panel__own_settings_kept({ count: ownCount }) : m.element_panel__single_one_wins() })}
      </Note>
      <div className="flex flex-col gap-5">
        <Section title={m.element_panel__section_colour()}>
          <Colour label={m.element_panel__fill_colour()} value={styles.background ?? b.background} onChange={(v) => onSet('background', v)} />
          <Colour label={m.element_panel__text_colour()} value={styles.color ?? b.color} onChange={(v) => onSet('color', v)} />
          <Colour label={m.element_panel__border_colour()} value={styles.borderColor ?? b.borderColor} onChange={(v) => onSet('borderColor', v)} />
        </Section>
        <Section title={m.element_panel__section_text()}>
          {range('fontSize', m.element_panel__text_size(), 12, 64, b.fontSize)}
          <Choice label={m.element_panel__weight()} value={String(fw >= 700 ? 800 : fw >= 500 ? 600 : 400)} onChange={(v) => onSet('fontWeight', v)} options={[['400', m.element_panel__light()], ['600', m.element_panel__medium()], ['800', m.element_panel__bold()]]} />
          <Choice
            label={m.element_panel__alignment()}
            value={styles.textAlign ?? b.textAlign}
            onChange={(v) => onSet('textAlign', v)}
            options={[
              ['left', <AlignLeft className="size-4" />, m.element_panel__left()],
              ['center', <AlignCenter className="size-4" />, m.element_panel__centre()],
              ['right', <AlignRight className="size-4" />, m.element_panel__right()],
            ]}
          />
        </Section>
        <Section title={m.element_panel__section_layout()}>
          <Choice label={m.element_panel__size()} value={styles.width ?? 'auto'} onChange={(v) => onSet('width', v)} options={[['auto', m.element_panel__fit()], ['70%', m.element_panel__wide()], ['100%', m.element_panel__full_width()]]} />
          {range('padding', m.element_panel__space_inside(), 0, 48, b.padding)}
          {range('borderRadius', m.element_panel__corner_roundness(), 0, 40, b.borderRadius)}
          {range('borderWidth', m.element_panel__border_thickness(), 0, 6, b.borderWidth)}
        </Section>
      </div>
      <Button variant="ghost" size="textTight" type="button" className="self-start" onClick={onReset}>
        {mode === 'element' ? m.element_panel__undo_changes_to_this() : m.element_panel__undo_changes_to_all()}
      </Button>
    </>
  )
}
