import { useContext, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LockKeyhole, Plug, Search, UserRound, Users } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { EmptyState } from '../blocks/EmptyState'
import { QueryState } from '../blocks/QueryState'
import { RowStack } from '../blocks/RowCard'
import { PikkuDot } from '../blocks/PikkuDot'
import { AccountsHero } from '../blocks/AccountsHero'
import { AccountRow } from '../blocks/AccountRow'
import { AccountPanel } from '../blocks/AccountPanel'
import { InviteAccountPanel } from '../blocks/InviteAccountPanel'
import { useProjectQuery } from '../lib/projectRpc'
import { useProjectKey, useProjectName } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { accountsProblem, type Account, type AccountsPage } from '../lib/accounts'

const PAGE = 25

export function AccountsScreen() {
  const { say } = useContext(ShellCtx)
  const key = useProjectKey()
  const projectName = useProjectName()
  const client = useQueryClient()
  const [term, setTerm] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const search = term.trim()
  const people = useProjectQuery<AccountsPage>(key, 'admin:listUsers', { limit, offset: 0, ...(search ? { search } : {}) }, { handlesErrors: true })
  const refresh = () => void client.invalidateQueries({ queryKey: ['project', key, 'admin:listUsers'] })
  const problem = people.isError ? accountsProblem(people.error) : null
  const selected: Account | undefined = open ? people.data?.users.find((u) => u.id === open) : undefined

  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.accounts_screen__title()} text={m.accounts_screen__text()} size="lead" developerDetails />
      <AccountsHero count={search ? undefined : people.data?.total} onInvite={() => { setOpen(null); setInviting(true) }} />

      {problem === 'not-running' ? (
        <EmptyState icon={Plug} title={m.accounts_screen__not_running_title()} text={m.accounts_screen__not_running_text()} />
      ) : problem === 'no-addon' ? (
        <EmptyState icon={Users} title={m.accounts_screen__no_addon_title()} text={m.accounts_screen__no_addon_text()}>
          <Button type="button" size="page" onClick={() => say(m.accounts_screen__add_it_say())}>
            <PikkuDot />
            {m.accounts_screen__add_it()}
          </Button>
        </EmptyState>
      ) : problem === 'forbidden' ? (
        <EmptyState icon={LockKeyhole} title={m.accounts_screen__cannot_see()} text={m.accounts_screen__cannot_see_text()}>
          <Button type="button" size="page" onClick={() => say(m.accounts_screen__ask_access_say())}>
            <PikkuDot />
            {m.accounts_screen__ask_access()}
          </Button>
        </EmptyState>
      ) : (
        <section className="flex min-w-0 flex-col gap-3" aria-label={m.accounts_screen__list_label()}>
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute top-1/2 start-3.5 size-5.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              shape="pill"
              className="h-12 border-[1.5px] border-input bg-field ps-10.5 text-px16 shadow-none md:text-px16"
              placeholder={m.accounts_screen__search()}
              aria-label={m.accounts_screen__search()}
              value={term}
              onChange={(e) => { setTerm(e.target.value); setLimit(PAGE) }}
            />
          </div>
          <QueryState
            query={people}
            skeleton={<div className="h-24 animate-pulse rounded-card border border-border bg-secondary" />}
            empty={(d) =>
              d.users.length ? null : search ? (
                <EmptyState layout="row" icon={Search} title={m.accounts_screen__nothing_matches()} text={m.accounts_screen__nothing_matches_text()}>
                  <Button type="button" variant="bordered" size="page" onClick={() => setTerm('')}>
                    {m.accounts_screen__clear_search()}
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState layout="row" icon={UserRound} title={m.accounts_hero__empty_title()} text={m.accounts_hero__empty_text()}>
                  <Button type="button" size="page" onClick={() => setInviting(true)}>
                    {m.accounts_hero__invite()}
                  </Button>
                </EmptyState>
              )
            }
          >
            {(d) => (
              <div className="flex min-w-0 flex-col gap-4">
                <RowStack>
                  {d.users.map((u) => (
                    <AccountRow key={u.id} account={u} onOpen={() => { setInviting(false); setOpen(u.id) }} />
                  ))}
                </RowStack>
                {d.users.length < d.total ? (
                  <div className="flex justify-center">
                    <Button type="button" variant="bordered" size="page" disabled={people.isFetching} aria-busy={people.isFetching} onClick={() => setLimit((n) => n + PAGE)}>
                      {m.accounts_screen__show_more()}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </QueryState>
        </section>
      )}

      {selected ? <AccountPanel key={selected.id} projectKey={key} account={selected} onChanged={refresh} onClose={() => setOpen(null)} /> : null}
      {inviting ? <InviteAccountPanel projectKey={key} onInvited={refresh} onClose={() => setInviting(false)} /> : null}
    </Page>
  )
}
