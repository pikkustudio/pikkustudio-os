import type { I18nNode, I18nString } from '@pikku/react'
import { asI18n } from '@pikku/react'
import { useContext, useState } from 'react'
import { LockKeyhole, Plug, ShieldAlert, ShieldCheck } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { EmptyState } from '../blocks/EmptyState'
import { QueryState } from '../blocks/QueryState'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { PikkuDot } from '../blocks/PikkuDot'
import { PermissionsHero } from '../blocks/PermissionsHero'
import { RolePanel } from '../blocks/RolePanel'
import { useProjectQuery } from '../lib/projectRpc'
import { useProjectKey, useProjectName } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { accountsProblem } from '../lib/accounts'
import { allowedCount, plainName, unusedIn, type DeclaredPermission, type Role } from '../lib/permissions'

const Group = ({ title, children }: { title: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    {children}
  </section>
)

export function PermissionsScreen() {
  const { say } = useContext(ShellCtx)
  const key = useProjectKey()
  const projectName = useProjectName()
  const [open, setOpen] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const roles = useProjectQuery<{ roles: Role[] }>(key, 'admin:scopeListRoles')
  const declared = useProjectQuery<{ scopes: DeclaredPermission[] }>(key, 'admin:scopeListDeclared')
  const vocabulary = declared.data?.scopes
  const problem = roles.isError ? accountsProblem(roles.error) : declared.isError ? accountsProblem(declared.error) : null
  const selected = open ? roles.data?.roles.find((r) => r.name === open) : undefined
  const unused = (vocabulary ?? []).filter((p) => !p.declared)
  const usable = (vocabulary ?? []).filter((p) => p.declared).length
  const create = () => {
    setOpen(null)
    setCreating(true)
  }

  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.permissions_screen__title()} text={m.permissions_screen__text()} size="lead" />
      <PermissionsHero count={roles.data?.roles.length} onCreate={create} />

      {problem === 'not-running' ? (
        <EmptyState icon={Plug} title={m.permissions_screen__not_running_title()} text={m.permissions_screen__not_running_text()} />
      ) : problem === 'no-addon' ? (
        <EmptyState icon={ShieldCheck} title={m.permissions_screen__no_addon_title()} text={m.permissions_screen__no_addon_text()}>
          <Button type="button" size="page" onClick={() => say(m.permissions_screen__add_it_say())}>
            <PikkuDot />
            {m.permissions_screen__add_it()}
          </Button>
        </EmptyState>
      ) : problem === 'forbidden' ? (
        <EmptyState icon={LockKeyhole} title={m.permissions_screen__cannot_see()} text={m.permissions_screen__cannot_see_text()}>
          <Button type="button" size="page" onClick={() => say(m.permissions_screen__ask_access_say())}>
            <PikkuDot />
            {m.permissions_screen__ask_access()}
          </Button>
        </EmptyState>
      ) : (
        <div className="flex min-w-0 flex-col gap-6.5">
          <Group title={m.permissions_screen__roles()}>
            <QueryState
              query={roles}
              skeleton={<div className="h-24 animate-pulse rounded-card border border-border bg-secondary" />}
              empty={(d) =>
                d.roles.length ? null : (
                  <EmptyState layout="row" icon={ShieldCheck} title={m.permissions_hero__empty_title()} text={m.permissions_hero__empty_text()}>
                    <Button type="button" size="page" onClick={create}>
                      {m.permissions_hero__create()}
                    </Button>
                  </EmptyState>
                )
              }
            >
              {(d) => (
                <RowStack>
                  {d.roles.map((r) => {
                    const n = allowedCount(r, vocabulary)
                    const stale = unusedIn(r, vocabulary).length
                    return (
                      <RowCard
                        key={r.name}
                        flag={stale > 0}
                        tile={<ShieldCheck className="size-5.5" />}
                        title={asI18n(r.name)}
                        caption={r.description ? asI18n(r.description) : undefined}
                        note={stale ? m.permissions_screen__role_has_unused({ n: stale }) : undefined}
                      >
                        <Dot tone={n ? 'ok' : 'quiet'}>{n ? m.permissions_screen__can_do({ n }) : m.permissions_screen__can_do_nothing()}</Dot>
                        <Button type="button" variant="bordered" size="compact" onClick={() => { setCreating(false); setOpen(r.name) }}>
                          {m.permissions_screen__change()}
                        </Button>
                      </RowCard>
                    )
                  })}
                </RowStack>
              )}
            </QueryState>
          </Group>

          <Group title={m.permissions_screen__vocabulary()}>
            <QueryState query={declared} skeleton={<div className="h-12 animate-pulse rounded-card border border-border bg-secondary" />}>
              {() => (
                <div className="flex flex-col gap-2">
                  <p className="px-1 text-px15 text-ink-2">
                    {usable ? m.permissions_screen__vocabulary_count({ n: usable }) : m.permissions_screen__vocabulary_none()}
                  </p>
                  {unused.length ? (
                    <RowStack>
                      {unused.map((p) => (
                        <RowCard key={p.id} flag tile={<ShieldAlert className="size-5.5" />} title={asI18n(plainName(p))} caption={m.permissions_screen__unused_caption()}>
                          <Button type="button" variant="bordered" size="compact" onClick={() => say(m.permissions_screen__unused_say({ id: asI18n(p.id) }))}>
                            <PikkuDot />
                            {m.permissions_screen__unused_tidy()}
                          </Button>
                        </RowCard>
                      ))}
                    </RowStack>
                  ) : null}
                </div>
              )}
            </QueryState>
          </Group>
        </div>
      )}

      {creating || selected ? (
        <RolePanel
          key={selected?.name ?? 'new'}
          projectKey={key}
          role={selected ?? null}
          declared={vocabulary ?? []}
          taken={roles.data?.roles.map((r) => r.name) ?? []}
          onClose={() => { setOpen(null); setCreating(false) }}
        />
      ) : null}
    </Page>
  )
}
