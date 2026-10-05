import { useEffect, useMemo, useState } from 'react'
import { usePikkuRPC } from '@pikku/react'
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
      <h1 className="text-xl font-semibold">Diff UI</h1>
      <div className="flex gap-2">
        {(['dark', 'light'] as const).map((t) => (
          <button key={t} onClick={() => { setTheme(t); setIndex(0) }} className={t === theme ? 'font-semibold underline' : ''}>
            {t}
          </button>
        ))}
      </div>
      {current ? (
        <>
          <select value={index} onChange={(e) => setIndex(Number(e.target.value))} className="w-fit">
            {shown.map((p, i) => (
              <option key={p.original} value={i}>{p.screen} · {p.state}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <figure><figcaption>Original</figcaption><img src={current.original} alt="original" /></figure>
            <figure><figcaption>Prototype</figcaption><img src={current.prototype} alt="prototype" /></figure>
          </div>
        </>
      ) : (
        <p>No screenshot pairs yet. Run compare-screen to produce some.</p>
      )}
    </div>
  )
}
