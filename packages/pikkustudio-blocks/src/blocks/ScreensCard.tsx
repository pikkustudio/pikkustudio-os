import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function ScreensCard({ options, text, answered, onApprove }: { options: string[]; text: string; answered: boolean; onApprove: (screens: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>(() => options.slice(0, 3))
  const [own, setOwn] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const all = [...options, ...own]
  const toggle = (name: string) => setPicked((now) => (now.includes(name) ? now.filter((n) => n !== name) : [...now, name]))
  const add = () => {
    const name = draft.trim()
    if (!name || all.includes(name)) return
    setOwn((now) => [...now, name])
    setPicked((now) => [...now, name])
    setDraft('')
  }
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <p className="m-0 text-[16px] font-semibold text-pretty">{text}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Screens to add">
        {all.map((name) => (
          <Button key={name} variant={picked.includes(name) ? 'selected' : 'filter'} size="compactTight" type="button" role="checkbox" aria-checked={picked.includes(name)} disabled={answered} onClick={() => toggle(name)}>
            {name}
          </Button>
        ))}
      </div>
      {answered ? null : (
        <>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add() }}>
            <Input className="h-9" placeholder="Add your own" aria-label="Add your own screen" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button variant="bordered" size="compact" type="submit" aria-label="Add this screen">
              <Plus />
            </Button>
          </form>
          <div>
            <Button size="compact" type="button" disabled={picked.length === 0} onClick={() => onApprove(picked)}>
              Add {picked.length === 1 ? 'this screen' : `these ${picked.length} screens`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
