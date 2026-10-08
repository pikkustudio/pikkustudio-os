import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { ExternalLink, Globe, Monitor, MousePointer2, Palette, PanelRightClose, RotateCw, Smartphone, Tablet } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card } from '../ui/card'
import { PageBreadcrumb, type PageGroup } from './PageBreadcrumb'
import { Segmented } from './Segmented'
import type { Device } from '../types/designTypes'

const withIcon = (Icon: typeof Palette, text: I18nString) => (
  <span className="inline-flex items-center gap-1.5">
    <Icon className="size-4" />
    <span className="hidden @min-[1100px]/bar:inline @min-[900px]/bar:group-aria-pressed:inline">{text}</span>
  </span>
)

export function PreviewBar({
  app,
  page,
  groups,
  device,
  tool,
  onPick,
  onDevice,
  onTool,
  onReload,
  onOpenTab,
  tools,
  actions,
  label,
  kind,
  hideDevice,
}: {
  app: string
  page: string
  groups: PageGroup[]
  device: Device
  tool: string
  onPick: (app: string, page: string) => void
  onDevice: (v: Device) => void
  onTool: (v: string) => void
  onReload: () => void
  onOpenTab?: () => void
  tools?: string[]
  actions?: I18nNode
  label?: I18nString
  kind?: 'page' | 'email' | 'artifact' | 'app'
  hideDevice?: boolean
}) {
  return (
    <Card variant="bar" role="toolbar" aria-label={m.preview_bar__preview_controls()}>
      <div className="@container/bar w-full">
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 @min-[1100px]/bar:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-2">
          {label ? <Badge variant="pillInfo">{label}</Badge> : null}
          {hideDevice ? null : (
            <Segmented label={m.preview_bar__screen_size()} value={device} onChange={(v) => onDevice(v as Device)} options={[['computer', <Monitor key="c" className="size-4" />, false, m.preview_bar__computer()], ['tablet', <Tablet key="t" className="size-4" />, false, m.preview_bar__tablet()], ['phone', <Smartphone key="p" className="size-4" />, false, m.preview_bar__phone()]]} />
          )}
          <Button variant="bar" size="bar" type="button" aria-label={m.preview_bar__reload_preview()} title={m.preview_bar__reload_preview()} onClick={onReload}>
            <RotateCw className="size-4.5" />
          </Button>
          <Button variant="bar" size="bar" type="button" aria-label={m.preview_bar__open_in_a_new()} title={m.preview_bar__open_in_a_new()} onClick={onOpenTab} disabled={!onOpenTab}>
            <ExternalLink className="size-4.5" />
          </Button>
        </div>
        <div className="flex min-w-0 justify-center">
          <PageBreadcrumb groups={groups} app={app} page={page} onPick={onPick} kind={kind} />
        </div>
        <div className="flex items-center justify-end gap-2">
          {tools && tools.length === 0 ? null : <Segmented label={m.preview_bar__what_to_do_on()} value={tool} onChange={onTool} options={([['design', withIcon(Palette, m.preview_bar__design()), false, m.preview_bar__design()], ['translations', withIcon(Globe, m.preview_bar__translations()), false, m.preview_bar__translations()], ['chat', withIcon(MousePointer2, m.preview_bar__select_for_chat()), false, m.preview_bar__select_for_chat()], ['none', withIcon(PanelRightClose, m.preview_bar__none()), false, m.preview_bar__none_close()]] as Array<[string, I18nNode, boolean?, I18nString?]>).filter(([id]) => !tools || tools.includes(id))} />}
        {actions}
        </div>
      </div>
      </div>
    </Card>
  )
}
