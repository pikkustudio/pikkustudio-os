import { asI18n, sep, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { ColorField } from './ColorField'
import { HintNote } from './HintNote'
import { InspectorSection } from './InspectorSection'
import { RangeField } from './RangeField'
import { SegmentField } from './SegmentField'
import type { Theme } from '../types/designTypes'

export function ThemePanel({
  themes,
  current,
  theme,
  swatches,
  fonts,
  contrast,
  onPick,
  onCreate,
  onChange,
}: {
  themes: Record<string, Theme>
  current: string
  theme: Theme
  swatches: string[]
  fonts: [string, I18nString][]
  contrast: I18nString
  onPick: (key: string) => void
  onCreate: (name: string) => void
  onChange: (patch: Partial<Theme>) => void
}) {
  const [name, setName] = useState('')
  return (
    <>
      <InspectorSection title={m.theme_panel__your_themes()}>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(themes).map(([key, t]) => (
            <button
              key={key}
              type="button"
              aria-pressed={key === current}
              onClick={() => onPick(key)}
              className="flex flex-col gap-1.5 rounded-[14px] border-2 border-border bg-card p-2 text-start text-px13 font-bold aria-pressed:border-primary aria-pressed:ring-3 aria-pressed:ring-accent"
            >
              <i className="block h-8.5 rounded-lg" style={{ background: `linear-gradient(135deg,${t.acc} 55%,${t.sup} 55%)` }} />
              {asI18n(t.name)}
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex gap-2">
          <Input shape="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.theme_panel__name_a_new_theme()} aria-label={m.theme_panel__new_theme_name()} />
          <Button
            variant="bordered"
            size="compact"
            type="button"
            className="h-11"
            onClick={() => {
              onCreate(name.trim() || m.theme_panel__my_theme())
              setName('')
            }}
          >
            
            {m.theme_panel__create()}
          </Button>
        </div>
      </InspectorSection>
      <InspectorSection title={m.theme_panel__brand_colours()}>
        <div className="flex flex-col gap-3">
          <ColorField label={m.theme_panel__main_accent_buttons_links()} value={theme.acc} onChange={(v) => onChange({ acc: v })} />
          <div className="flex flex-wrap gap-2">
            {swatches.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={m.theme_panel__use({ name: c })}
                aria-pressed={c.toLowerCase() === theme.acc.toLowerCase()}
                onClick={() => onChange({ acc: c })}
                style={{ background: c }}
                className="size-7.5 rounded-full border-2 border-card ring-[1.5px] ring-input aria-pressed:ring-3 aria-pressed:ring-primary"
              />
            ))}
          </div>
          <ColorField label={m.theme_panel__highlight_price_tags_badges()} value={theme.sup} onChange={(v) => onChange({ sup: v })} />
          <ColorField label={m.theme_panel__page_colour_light_mode()} value={theme.bg} onChange={(v) => onChange({ bg: v })} />
          <ColorField label={m.theme_panel__text_colour_light_mode()} value={theme.ink} onChange={(v) => onChange({ ink: v })} />
        </div>
      </InspectorSection>
      <InspectorSection title={m.theme_panel__fonts()}>
        <div className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1">
            <span className="text-px13 font-bold text-muted-foreground">{m.theme_panel__headings()}</span>
            <Select value={theme.hf} onValueChange={(v) => onChange({ hf: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fonts.map(([k, l]) => (
                  <SelectItem key={k} value={k}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-px13 font-bold text-muted-foreground">{m.theme_panel__body_text()}</span>
            <Select value={theme.bf} onValueChange={(v) => onChange({ bf: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fonts.map(([k, l]) => (
                  <SelectItem key={k} value={k}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </InspectorSection>
      <InspectorSection title={m.theme_panel__shape_and_mood()}>
        <div className="flex flex-col gap-3.5">
          <RangeField label={m.theme_panel__corner_roundness()} min={0} max={32} value={theme.r} unit="px" onChange={(v) => onChange({ r: v })} />
          <SegmentField
            label={m.theme_panel__light_or_dark()}
            value={theme.mode}
            onChange={(v) => onChange({ mode: v as Theme['mode'] })}
            options={[['light', m.theme_panel__light()], ['dark', m.theme_panel__dark()], ['auto', m.theme_panel__automatic()]]}
            note={m.theme_panel__automatic_follows_each_visitor_s()}
          />
        </div>
      </InspectorSection>
      <InspectorSection title={m.theme_panel__easy_to_read()}>
        <Switch checked={theme.auto} onCheckedChange={(v) => onChange({ auto: v })}>
          
          {m.theme_panel__keep_text_easy_to()}
        </Switch>
        <p className="mt-2 text-[13.5px] leading-[1.45] text-ink-2">
          {m.theme_panel__contrast_note()}{sep(' ')}<b>{contrast}</b>
        </p>
      </InspectorSection>
      <InspectorSection title={m.theme_panel__depth()}>
        <div className="flex flex-col gap-3.5">
          <RangeField label={m.theme_panel__shade_strength()} min={1} max={8} value={theme.shade} unit="" onChange={(v) => onChange({ shade: v })} />
          <SegmentField label={m.theme_panel__background_blend()} value={theme.grad} onChange={(v) => onChange({ grad: v as Theme['grad'] })} options={[['none', m.theme_panel__none()], ['soft', m.theme_panel__soft()], ['strong', m.theme_panel__strong()]]} />
          <SegmentField label={m.theme_panel__shadows()} value={theme.sh} onChange={(v) => onChange({ sh: v as Theme['sh'] })} options={[['none', m.theme_panel__none()], ['soft', m.theme_panel__soft()], ['strong', m.theme_panel__strong()]]} />
        </div>
      </InspectorSection>
      <HintNote>{m.theme_panel__theme_changes_apply_to()}</HintNote>
    </>
  )
}
