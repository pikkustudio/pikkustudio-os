import { useNavigate } from '@tanstack/react-router'
import { CHANGES, REAL } from './data'
import { TimelineDock } from './B'
import { Pill } from './parts'

export function ChangesPanel() {
  const nav = useNavigate()
  const pick = (id: string) => nav({ to: '/changes-directions' as never, search: ((p: Record<string, unknown>) => ({ ...p, change: id, panel: 'chat' })) as never })
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <TimelineDock />
      <ul className="flex flex-col gap-2.5 px-5 py-4">
        {CHANGES.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => pick(c.id)} className="flex w-full cursor-pointer flex-col items-start gap-1.5 rounded-[16px] border-[1.5px] border-border bg-card p-4 text-left transition-colors hover:border-muted-foreground">
              <Pill s={c.state} small />
              <b className="text-[16px] leading-[1.3]">{c.title}</b>
              <span className="text-[13px] text-muted-foreground">
                {c.from} · {REAL[c.id].shortId} · {c.when}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
