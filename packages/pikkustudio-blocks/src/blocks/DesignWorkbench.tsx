import { m } from '@/i18n/messages'
import { useContext, useState, type CSSProperties } from 'react'
import { Globe, MousePointer2 } from 'lucide-react'
import { ShellCtx } from '../lib/shell'
import { ChatSelectPanel } from './ChatSelectPanel'
import { DesignInspector } from './DesignInspector'
import { ElementPanel } from './ElementPanel'
import { HintRow } from './HintRow'
import { PreviewBar } from './PreviewBar'
import { SitePreview } from './SitePreview'
import { ThemePanel } from './ThemePanel'
import { TranslationPanel } from './TranslationPanel'
import { sample } from '../mocks/designSample'
import type { Device, Kind, Mode, Selection, Styles, Theme, Translations } from '../types/designTypes'

const lum = (h: string) => {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a: string, b: string) => {
  const x = lum(a)
  const y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const hex = (c: string) => {
  const m = c.match(/\d+(\.\d+)?/g)
  return m ? '#' + [0, 1, 2].map((i) => ('0' + Math.round(+m[i]).toString(16)).slice(-2)).join('') : '#000000'
}

function siteLook(T: Theme) {
  const dark = T.mode === 'auto' ? window.matchMedia('(prefers-color-scheme:dark)').matches : T.mode === 'dark'
  const bg = dark ? '#14181D' : T.bg
  const ink = dark ? '#F2F4F5' : T.ink
  const on = T.auto ? (ratio('#FFFFFF', T.acc) >= ratio('#111111', T.acc) ? '#FFFFFF' : '#111111') : '#FFFFFF'
  const pct = T.shade * 4
  const softC = `color-mix(in srgb,${T.acc} ${pct}%,${bg})`
  const hero = T.grad === 'none' ? softC : T.grad === 'soft' ? `linear-gradient(135deg,${softC},color-mix(in srgb,${T.sup} ${pct}%,${bg}))` : `linear-gradient(135deg,${T.acc} 0%,color-mix(in srgb,${T.acc} 55%,${T.sup}) 100%)`
  const vars = {
    '--s-acc': T.acc,
    '--s-sup': T.sup,
    '--s-bg': bg,
    '--s-ink': ink,
    '--s-on': on,
    '--s-hf': sample.fonts[T.hf][1],
    '--s-bf': sample.fonts[T.bf][1],
    '--s-r': `${T.r}px`,
    '--s-hero': hero,
    '--s-sh': T.sh === 'none' ? 'none' : T.sh === 'soft' ? '0 4px 14px rgba(0,0,0,.10)' : '0 14px 34px rgba(0,0,0,.28)',
  } as CSSProperties
  return { vars, heroColor: T.grad === 'strong' ? on : undefined, contrast: `${ratio(on, T.acc).toFixed(1)} to 1` }
}

export function DesignWorkbench({ mode, device, app, page, onMode, onDevice, onOpen }: { mode: Mode; device: Device; app: 'pub' | 'staff'; page: string; onMode: (m: Mode) => void; onDevice: (d: Device) => void; onOpen: (a: 'pub' | 'staff', p: string) => void }) {
  const { attached, attach } = useContext(ShellCtx)
  const [themes, setThemes] = useState(sample.themes)
  const [current, setCurrent] = useState('sunrise')
  const [T, setT] = useState<Theme>({ ...sample.themes.sunrise })
  const [comp, setComp] = useState<Partial<Record<Kind, Styles>>>({})
  const [own, setOwn] = useState<Record<string, Styles>>({})
  const [kinds, setKinds] = useState<Record<string, Kind>>({})
  const [sel, setSel] = useState<Selection | null>(null)
  const [tr, setTr] = useState(sample.translations)
  const [reloadKey, setReloadKey] = useState(0)

  const tool = mode === 'translations' || mode === 'chat' || mode === 'none' ? mode : 'design'
  const look = siteLook(T)
  const go = (m: Mode) => {
    setSel(null)
    onMode(m)
  }
  const pickTool = (t: string) => go(t === 'design' ? (mode === 'translations' || mode === 'chat' || mode === 'none' ? 'theme' : mode) : (t as Mode))

  const pick = (node: HTMLElement) => {
    const cs = getComputedStyle(node)
    const site = document.getElementById('site') as HTMLElement
    const kind = node.dataset.el as Kind
    const id = node.dataset.id as string
    setKinds((k) => ({ ...k, [id]: kind }))
    if (mode === 'chat') attach(node.dataset.name as string)
    setSel({
      id,
      kind,
      name: node.dataset.name as string,
      i18n: node.dataset.i18n,
      count: site.querySelectorAll(`[data-el="${kind}"]`).length,
      base: {
        background: hex(cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? getComputedStyle(site).backgroundColor : cs.backgroundColor),
        color: hex(cs.color),
        fontSize: parseInt(cs.fontSize),
        fontWeight: Number(cs.fontWeight),
        padding: parseInt(cs.paddingTop),
        textAlign: cs.textAlign === 'start' ? 'left' : cs.textAlign,
        borderRadius: parseInt(cs.borderTopLeftRadius),
        borderWidth: parseInt(cs.borderTopWidth),
        borderColor: hex(cs.borderTopColor),
      },
    })
  }

  const setStyle = (prop: string, raw: string) => {
    if (!sel) return
    let v = raw
    const extra: Styles = {}
    if (prop === 'padding' && sel.kind === 'button') v = `${parseInt(raw)}px ${Math.round(parseInt(raw) * 1.8)}px`
    if (prop === 'borderWidth') extra.borderStyle = 'solid'
    if (mode === 'element') {
      if (prop === 'width' && raw !== 'auto' && sel.kind !== 'button') extra.display = 'block'
      setOwn((o) => ({ ...o, [sel.id]: { ...o[sel.id], [prop]: v, ...extra } }))
    } else {
      setComp((c) => ({ ...c, [sel.kind]: { ...c[sel.kind], [prop]: v, ...extra } }))
    }
  }
  const resetStyle = () => {
    if (!sel) return
    if (mode === 'element') setOwn((o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== sel.id)))
    else setComp((c) => ({ ...c, [sel.kind]: undefined }))
  }
  const ownCount = sel ? Object.keys(own).filter((id) => kinds[id] === sel.kind && Object.keys(own[id]).length).length : 0
  const editing = mode === 'element' ? own[sel?.id ?? ''] : mode === 'component' ? comp[sel?.kind as Kind] : undefined
  const entry = sel?.i18n ? tr[sel.i18n] : undefined

  let title = 'Theme'
  let body
  if (mode === 'theme') {
    body = (
      <ThemePanel
        themes={themes}
        current={current}
        theme={T}
        swatches={sample.swatches}
        fonts={Object.entries(sample.fonts).map(([k, f]) => [k, f[0]])}
        contrast={look.contrast}
        onPick={(k) => {
          setCurrent(k)
          setT({ ...themes[k] })
        }}
        onCreate={(name) => {
          const k = `t${Object.keys(themes).length}`
          setThemes((t) => ({ ...t, [k]: { ...T, name } }))
          setCurrent(k)
        }}
        onChange={(patch) => setT((t) => ({ ...t, ...patch }))}
      />
    )
  } else if (mode === 'element' || mode === 'component') {
    title = mode === 'element' ? 'Element' : 'Component'
    if (!sel) {
      body = <HintRow icon={MousePointer2}>{mode === 'element' ? m.design_workbench__click_one_thing_in() : m.design_workbench__click_anything_in_the()}</HintRow>
    } else {
      title = mode === 'element' ? sel.name : `All ${sample.kinds[sel.kind]}`
      body = <ElementPanel mode={mode} selection={sel} styles={editing ?? {}} ownCount={ownCount} onSet={setStyle} onReset={resetStyle} />
    }
  } else if (mode === 'translations') {
    title = 'Translations'
    body = entry ? <TranslationPanel entry={entry} onEdit={(l, v) => setTr((t) => ({ ...t, [sel!.i18n as string]: { ...t[sel!.i18n as string], [l]: v } }))} /> : <HintRow icon={Globe}>{m.design_workbench__click_any_underlined_wording()}</HintRow>
  } else {
    title = m.design_workbench__select_for_chat()
    body = <ChatSelectPanel attached={attached} />
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <PreviewBar
        app={app}
        page={page}
        groups={(['pub', 'staff'] as const).map((a) => ({ app: a, label: sample.apps[a], pages: sample.pages[a].map(([id, name, text]) => ({ id, name, text })) }))}
        device={device}
        tool={tool}
        onPick={(a, p) => {
          setSel(null)
          onOpen(a as 'pub' | 'staff', p)
        }}
        onDevice={onDevice}
        onTool={pickTool}
        onReload={() => setReloadKey((k) => k + 1)}
      />
      <div className={`grid min-h-0 flex-1 gap-3.5 ${mode === 'none' ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_340px]'}`}>
        <SitePreview device={device} page={page} vars={look.vars} heroColor={look.heroColor} mode={mode} comp={comp} own={own} sel={sel?.id ?? null} tr={tr} content={sample.content} reloadKey={reloadKey} onPick={pick} />
        {mode !== 'none' && (
          <DesignInspector title={title} mode={mode} showModes={tool === 'design'} onMode={go} onClose={tool === 'design' ? undefined : () => go('none')}>
            {body}
          </DesignInspector>
        )}
      </div>
    </div>
  )
}
