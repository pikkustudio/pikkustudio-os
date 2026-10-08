import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Segmented } from './Segmented'
import type { Mode } from '../types/designTypes'

export function DesignInspector({ title, mode, showModes, onMode, onClose, children }: { title: I18nString; mode: Mode; showModes: boolean; onMode: (m: Mode) => void; onClose?: () => void; children: I18nNode }) {
  return (
    <Card variant="inspector" role="complementary" aria-label={m.design_inspector__design_controls()}>
      <div className="flex flex-col gap-2.5 border-b border-border px-4 py-3.5">
        <div className="relative">
          <h2 className="text-[19px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{title}</h2>
          {onClose ? (
            <Button variant="ghost" size="icon" type="button" aria-label={m.design_inspector__close_panel()} className="absolute -top-2 -end-2" onClick={onClose}>
              <X className="size-5" />
            </Button>
          ) : null}
        </div>
        {showModes ? (
          <Segmented label={m.design_inspector__design_mode()} value={mode} onChange={(v) => onMode(v as Mode)} options={[['theme', m.design_inspector__mode_theme()], ['element', m.design_inspector__mode_element()], ['component', m.design_inspector__mode_component()]]} />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4.5 overflow-auto px-4 pt-3.5 pb-5">{children}</div>
    </Card>
  )
}
