import { m } from '@/i18n/messages'
import { useEffect, useMemo, useState } from 'react'
import { asI18n, sep, usePikkuRPC } from '@pikku/react'
import type { DiffPair } from '../diffs.js'

export default function Home() {
  const rpc = usePikkuRPC() as { invoke: (name: string, data?: unknown) => Promise<{ pairs: DiffPair[] }> }
  const [pairs, setPairs] = useState<DiffPair[]>([])
  useEffect(() => {
    void rpc.invoke('diffui:diffuiList').then((r) => setPairs(r.pairs))
  }, [rpc])
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const shown = useMemo(() => pairs.filter((p) => p.theme === theme), [pairs, theme])
  const [index, setIndex] = useState(0)
  const current = shown[Math.min(index, shown.length - 1)]
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{m.diffui_home__diff_ui()}</h1>
      <div className="flex gap-2">
        {(['dark', 'light'] as const).map((t) => (
          <button key={t} onClick={() => { setTheme(t); setIndex(0) }} className={t === theme ? 'font-semibold underline' : ''}>
            {t === 'dark' ? m.diffui_home__theme_dark() : m.diffui_home__theme_light()}
          </button>
        ))}
      </div>
      {current ? (
        <>
          <select value={index} onChange={(e) => setIndex(Number(e.target.value))} className="w-fit">
            {shown.map((p, i) => (
              <option key={p.original} value={i}>{asI18n(p.screen)}{sep(' · ')}{asI18n(p.state)}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <figure><figcaption>{m.diffui_home__original()}</figcaption><img src={current.original} alt={m.diffui_home__original_alt()} /></figure>
            <figure><figcaption>{m.diffui_home__prototype()}</figcaption><img src={current.prototype} alt={m.diffui_home__prototype_alt()} /></figure>
          </div>
        </>
      ) : (
        <p>{m.diffui_home__no_screenshot_pairs_yet_run_compare()}</p>
      )}
    </div>
  )
}
