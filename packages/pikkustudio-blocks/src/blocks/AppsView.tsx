import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { ArrowUp, Plus } from 'lucide-react'
import { useProjectName } from '../lib/project'
import { Input } from '../ui/input'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { Button } from '../ui/button'
import { AppCard, type AppItem } from './AppCard'
import { appKinds } from './AppKindList'
import { PageHead } from './PageHead'

type ProjectApp = { slug: string; url: string | null; state: 'starting' | 'ready' | 'failed' }

const fromProject = (apps: ProjectApp[]): AppItem[] =>
  apps.map((a) => ({
    id: a.slug,
    kind: 'web',
    name: a.slug,
    summary: a.url ?? m.apps_view__a_website_this_project(),
    sketch: 'home',
    state: a.state === 'ready' ? 'made' : 'building',
    when: a.state === 'failed' ? 'did not start' : 'running now',
  }))

export function AppsView() {
  const projectName = useProjectName()
  const key = useProjectKey()
  const apps = usePikkuQuery('studio:projectApps', { key }, { enabled: !!key, refetchInterval: 4000 })
  const [extra, setExtra] = useState<AppItem[]>([])
  const items = [...fromProject((apps.data as ProjectApp[] | undefined) ?? []), ...extra]
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')
  const { say } = useContext(ShellCtx)
  const send = (t: string) => {
    if (t.trim()) say(t.trim())
    setQ('')
  }
  const add = (kind: string, title: string) => {
    setExtra((all) => [...all, { id: `${kind}-${all.length}`, kind, name: m.apps_view__new_kind({ kind: title.toLowerCase() }), summary: m.apps_view__pikku_will_set_this(), sketch: 'home', state: 'new', when: 'never' }])
    setAdding(false)
  }
  return (
    <>
      <PageHead crumb={projectName} title={m.apps_view__apps()} text={m.apps_view__everything_you_are_making()} size="lead">
        <Button variant="default" size="page" type="button" aria-expanded={adding} onClick={() => setAdding(!adding)}>
          <Plus className="size-5" />
          
          {m.apps_view__new_app()}
        </Button>
      </PageHead>
      <section className="flex flex-col gap-2.5" aria-label={m.apps_view__tell_pikku_what_to()}>
        <form className="relative" onSubmit={(e) => { e.preventDefault(); send(q) }}>
          <Input shape="pill" className="h-12 border-[1.5px] border-input bg-field pl-5 pr-14 text-px16 shadow-none md:text-px16" placeholder={m.apps_view__tell_pikku_what_to_2()} aria-label={m.apps_view__tell_pikku_what_to()} value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="default" size="compactTight" type="submit" aria-label={m.apps_view__send()} className="absolute top-1/2 right-2 -translate-y-1/2">
            <ArrowUp className="size-5" />
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={m.apps_view__ideas()}>
          {[m.apps_view__idea_1(), m.apps_view__idea_2(), m.apps_view__idea_3(), m.apps_view__idea_4(), m.apps_view__idea_5()].map((t) => (
            <Button key={t} variant="filter" size="compactTight" type="button" onClick={() => send(t)}>
              {t}
            </Button>
          ))}
        </div>
      </section>
      {adding ? (
        <section className="flex flex-col gap-3" aria-label={m.apps_view__what_kind_of_app()}>
          <h2 className="m-0 text-[18px] font-bold">{m.apps_view__what_kind_of_app_2()}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
            {appKinds().map(({ id, title, text, Icon }) => (
              <button key={id} type="button" onClick={() => add(id, title)} className="flex cursor-pointer flex-col items-start gap-2 rounded-card border border-border bg-card p-4 text-start shadow-card transition-colors hover:border-primary">
                <span className="grid size-11 place-items-center rounded-lg bg-secondary text-ink-2">
                  <Icon className="size-5" />
                </span>
                <b className="text-[16px]">{title}</b>
                <span className="text-px14 text-ink-2">{text}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
        {items.map((a) => (
          <AppCard key={a.id} item={a} />
        ))}
      </div>
    </>
  )
}
