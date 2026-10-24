import type { I18nNode, I18nString } from '@pikku/react'
import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { KeyRound, Link2, LockKeyhole, Plug, UsersRound } from 'lucide-react'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { EmptyState } from '../blocks/EmptyState'
import { QueryState } from '../blocks/QueryState'
import { ErrorState, detailsOf, faultOf } from '../blocks/ErrorState'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { PikkuDot } from '../blocks/PikkuDot'
import { ConnectionDrawer } from '../blocks/ConnectionDrawer'
import { ShellCtx } from '../lib/shell'
import { useProjectKey, useProjectName } from '../lib/project'
import { accountsProblem } from '../lib/accounts'
import { useConnect, useConnections, type Connection } from '../lib/connections'

const Group = ({ title, sub, children }: { title: I18nString; sub: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    <p className="-mt-1 px-1 text-[14px] text-ink-2">{sub}</p>
    {children}
  </section>
)

export function ConnectionsScreen() {
  const { say } = useContext(ShellCtx)
  const key = useProjectKey()
  const app = useProjectName()
  const { meta, status, users, shared, own, isConnected, connectedTo } = useConnections(key)
  const { connect, refresh } = useConnect(key)
  const [open, setOpen] = useState<string | null>(null)
  const missing = shared.filter((c) => isConnected(c.name) === false)
  const first = missing[0]
  const selected = [...shared, ...own].find((c) => c.name === open)
  const problemError = status.isError ? status.error : users.isError ? users.error : null
  const problem = problemError ? accountsProblem(problemError) : null
  const problemSay =
    problem === 'forbidden'
      ? m.connections_screen__cannot_see_say()
      : problem === 'not-running'
        ? m.connections_screen__not_running_say()
        : problem === 'no-addon'
          ? m.connections_screen__no_check_say()
          : m.error_state__fix_ask_what({ what: m.connections_screen__title(), details: detailsOf(faultOf(problemError), m.connections_screen__title()) })
  const problemWhy =
    problem === 'forbidden'
      ? m.connections_screen__cannot_see_text()
      : problem === 'not-running'
        ? m.connections_screen__not_running_text()
        : problem === 'no-addon'
          ? m.connections_screen__no_check_text()
          : m.connections_screen__hero_problem_why()

  const start = (c: Connection) => (c.signIn ? connect(c.name) : setOpen(c.name))

  const sharedRow = (c: Connection) => {
    const on = isConnected(c.name)
    return (
      <RowCard
        key={c.name}
        tile={c.signIn ? <Link2 className="size-5" /> : <KeyRound className="size-5" />}
        on={on === true}
        flag={on === false}
        title={asI18n(c.label)}
        caption={on === false && c.about ? asI18n(c.about) : undefined}
      >
        <Dot tone={on ? 'ok' : on === false ? 'warn' : 'quiet'}>{on ? m.connections_screen__connected() : on === false ? m.connections_screen__needs_connecting() : m.connections_screen__checking()}</Dot>
        {on === false ? (
          <Button type="button" variant="bordered" size="compact" onClick={() => start(c)}>
            {c.signIn ? m.connections_screen__connect() : m.connections_screen__add_key()}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="compactTight" onClick={() => setOpen(c.name)}>
          {m.connections_screen__details()}
        </Button>
      </RowCard>
    )
  }

  const ownRow = (c: Connection) => {
    const count = connectedTo(c.name).length
    return (
      <RowCard key={c.name} tile={<UsersRound className="size-5" />} title={asI18n(c.label)} caption={c.about ? asI18n(c.about) : undefined}>
        <Dot tone={count ? 'ok' : 'quiet'}>{users.isPending ? m.connections_screen__checking() : m.connections_screen__people_connected({ count })}</Dot>
        <Button type="button" variant="bordered" size="compact" onClick={() => setOpen(c.name)}>
          {m.connections_screen__see_who()}
        </Button>
      </RowCard>
    )
  }

  return (
    <Page gap="snug">
      <PageHead crumb={app} title={m.connections_screen__title()} text={m.connections_screen__text()} size="lead" developerDetails />

      <QueryState query={meta} skeleton={<div className="h-56 animate-pulse rounded-next border border-border bg-secondary" />}>
        {() =>
          shared.length + own.length === 0 ? (
            <EmptyState icon={Plug} title={m.connections_screen__none_title()} text={m.connections_screen__none_text()}>
              <Button type="button" size="page" onClick={() => say(m.connections_screen__none_say())}>
                <PikkuDot />
                {m.connections_screen__none_ask()}
              </Button>
            </EmptyState>
          ) : (
            <>
              <NextCard
                label={m.connections_screen__hero_label()}
                hue={first || problem ? 'teal' : 'sea'}
                page="connections"
                title={first ? m.connections_screen__hero_missing({ count: missing.length }) : problem ? m.connections_screen__hero_problem() : status.isPending ? m.connections_screen__hero_checking() : m.connections_screen__hero_ok()}
                why={first ? m.connections_screen__hero_missing_why({ name: asI18n(first.label) }) : problem ? problemWhy : status.isPending ? m.connections_screen__text() : m.connections_screen__hero_ok_why()}
              >
                {problem && !first ? (
                  <div className="flex flex-wrap gap-3">
                    <Button variant="hero" size="pageLg" type="button" onClick={() => say(problemSay)}>
                      <PikkuDot />
                      {problem === 'forbidden' ? m.connections_screen__cannot_see_ask() : m.connections_screen__no_check_ask()}
                    </Button>
                  </div>
                ) : first ? (
                  <div className="flex flex-wrap gap-3">
                    <Button variant="hero" size="pageLg" type="button" onClick={() => start(first)}>
                      {first.signIn ? m.connections_screen__connect_name({ name: asI18n(first.label) }) : m.connections_screen__add_key_name({ name: asI18n(first.label) })}
                    </Button>
                  </div>
                ) : null}
              </NextCard>

              {problem === 'forbidden' ? (
                <EmptyState layout="row" icon={LockKeyhole} title={m.connections_screen__cannot_see()} text={m.connections_screen__cannot_see_text()}>
                  <Button type="button" size="page" onClick={() => say(problemSay)}>
                    <PikkuDot />
                    {m.connections_screen__cannot_see_ask()}
                  </Button>
                </EmptyState>
              ) : problem === 'not-running' ? (
                <EmptyState layout="row" icon={Plug} title={m.connections_screen__not_running()} text={m.connections_screen__not_running_text()}>
                  <Button type="button" size="page" onClick={() => say(problemSay)}>
                    <PikkuDot />
                    {m.connections_screen__not_running_ask()}
                  </Button>
                </EmptyState>
              ) : problem === 'other' ? (
                <ErrorState error={problemError} what={m.connections_screen__title()} onRetry={refresh} />
              ) : problem ? (
                <EmptyState layout="row" icon={Plug} title={m.connections_screen__no_check()} text={m.connections_screen__no_check_text()}>
                  <Button type="button" size="page" onClick={() => say(m.connections_screen__no_check_say())}>
                    <PikkuDot />
                    {m.connections_screen__no_check_ask()}
                  </Button>
                </EmptyState>
              ) : null}

              {shared.length ? (
                <Group title={m.connections_screen__shared_title()} sub={m.connections_screen__shared_sub()}>
                  <RowStack>{[...missing, ...shared.filter((c) => !missing.includes(c))].map(sharedRow)}</RowStack>
                </Group>
              ) : null}
              {own.length ? (
                <Group title={m.connections_screen__own_title()} sub={m.connections_screen__own_sub()}>
                  <RowStack>{own.map(ownRow)}</RowStack>
                </Group>
              ) : null}
            </>
          )
        }
      </QueryState>

      {selected ? (
        <ConnectionDrawer
          key={selected.name}
          projectKey={key}
          c={selected}
          connected={isConnected(selected.name)}
          people={connectedTo(selected.name)}
          onConnect={() => connect(selected.name)}
          onChanged={refresh}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </Page>
  )
}
