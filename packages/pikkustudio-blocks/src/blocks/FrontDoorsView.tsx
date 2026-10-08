import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { ArrowUpRight, DoorOpen } from 'lucide-react'
import { useProjectKey, useProjectName } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { API_KINDS, useFrontDoors, type Door } from '../lib/frontDoors'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { FrontDoorCard } from './FrontDoorCard'
import { NextCard } from './NextCard'
import { PageHead } from './PageHead'
import { PikkuDot } from './PikkuDot'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="270" cy="165" r="9" className="fill-coral" />
      <path d="M130 170V96a40 40 0 0 1 80 0v74z" className="fill-w6" opacity="0.92" />
      <path d="M148 170V98a22 22 0 0 1 44 0v72z" className="fill-w2" />
      <circle cx="180" cy="124" r="4.5" className="fill-w6" />
    </>
  )
}

const groups = (): Array<{ title: string; text: string; kinds: Door['kind'][] }> => [
  { title: m.front_doors__group_web(), text: m.front_doors__group_web_text(), kinds: ['web'] },
  { title: m.front_doors__group_cli(), text: m.front_doors__group_cli_text(), kinds: ['cli'] },
  { title: m.front_doors__group_mcp(), text: m.front_doors__group_mcp_text(), kinds: ['mcp'] },
  { title: m.front_doors__group_gateway(), text: m.front_doors__group_gateway_text(), kinds: ['gateway'] },
  { title: m.front_doors__group_api(), text: m.front_doors__group_api_text(), kinds: API_KINDS },
]

export function FrontDoorsView() {
  const projectName = useProjectName()
  const key = useProjectKey()
  const { say } = useContext(ShellCtx)
  const [showApi, setShowApi] = useState(false)
  const { doors, docs, isPending, error, refetch, fetching } = useFrontDoors(key)

  const shown = doors.filter((d) => showApi || !API_KINDS.includes(d.kind))
  const hiddenApi = doors.length - doors.filter((d) => !API_KINDS.includes(d.kind)).length
  const firstApp = doors.find((d) => d.kind === 'web' && d.app.state === 'ready' && d.app.url)
  const ask = () => say(m.front_doors__add_say())

  const head = (
    <PageHead crumb={projectName} title={m.front_doors__title()} text={m.front_doors__lead({ name: projectName })} size="lead" />
  )

  if (error)
    return (
      <>
        {head}
        <ErrorState error={error} what={m.front_doors__title()} onRetry={() => void refetch()} retrying={fetching} />
      </>
    )

  const hero = (
    <NextCard
      label={m.front_doors__title()}
      hue="petrol"
      art={<Art />}
      title={isPending ? m.front_doors__hero_loading() : shown.length === 1 ? m.front_doors__hero_one() : shown.length ? m.front_doors__hero_count({ count: shown.length }) : m.front_doors__hero_none()}
      why={shown.length ? m.front_doors__hero_why({ name: projectName }) : m.front_doors__hero_why_none()}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {firstApp && firstApp.kind === 'web' && firstApp.app.url ? (
          <Button asChild variant="hero" size="pageLg">
            <a href={firstApp.app.url} target="_blank" rel="noreferrer">
              {m.front_doors__hero_open()}
              <ArrowUpRight className="size-4.5" />
            </a>
          </Button>
        ) : (
          <Button variant="hero" size="pageLg" type="button" onClick={ask}>
            <PikkuDot />
            {m.front_doors__hero_ask()}
          </Button>
        )}
      </div>
    </NextCard>
  )

  return (
    <>
      {head}
      {hero}
      <Switch checked={showApi} onCheckedChange={setShowApi} className="self-start">
        {m.front_doors__toggle()}
      </Switch>
      {isPending ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="h-60 animate-pulse rounded-card border border-border bg-secondary" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState icon={DoorOpen} title={m.front_doors__empty_title()} text={hiddenApi ? m.front_doors__empty_hidden() : m.front_doors__empty_text()}>
          {hiddenApi ? (
            <Button variant="bordered" size="page" type="button" onClick={() => setShowApi(true)}>
              {m.front_doors__empty_show()}
            </Button>
          ) : (
            <Button variant="default" size="page" type="button" onClick={ask}>
              <PikkuDot />
              {m.front_doors__hero_ask()}
            </Button>
          )}
        </EmptyState>
      ) : (
        groups().map((g) => {
          const items = shown.filter((d) => g.kinds.includes(d.kind))
          if (!items.length) return null
          return (
            <section key={g.title} className="flex flex-col gap-3" aria-label={g.title}>
              <div className="px-1 pt-2">
                <h2 className="text-px14 font-bold text-muted-foreground">{g.title}</h2>
                <p className="mt-0.5 text-px14 text-muted-foreground text-pretty">{g.text}</p>
              </div>
              {items.map((d) => (
                <FrontDoorCard key={d.id} projectKey={key} door={d} docs={docs} />
              ))}
            </section>
          )
        })
      )}
    </>
  )
}
