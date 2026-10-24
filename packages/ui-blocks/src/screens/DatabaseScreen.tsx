import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { Database, ShieldCheck, Table2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { PikkuDot } from '../blocks/PikkuDot'
import { RowCard, RowStack } from '../blocks/RowCard'
import { Section } from '../blocks/Section'
import { TechDetails } from '../blocks/TechDetails'
import { useDeveloperDetails } from '../lib/developer-details'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { ShellCtx } from '../lib/shell'
import { WorkSkeleton } from './work-shared'

type Column = { name: string; type?: string; isPrimaryKey?: boolean; classification?: string; foreignKey?: { table: string; column: string } }
type DbTable = { name: string; columns: Column[]; source?: string }
type Schema = { tables?: DbTable[] } | null

const HIDDEN = /^(migrations|pgmigrations|sql_migrations|kysely_migration.*|sqlite_.*|_cf_.*)$/
const BUILT_IN = /^(user|account|session|verification|authjs_.*|pikku_.*|workflow_.*|channels|channel_subscriptions|webhook_delivery.*|secrets.*|secret_.*|credential.*|audit|virtual_user_.*|agent_.*|ai_.*)$/
const SHOWN_FIELDS = 6

const isBuiltIn = (t: DbTable) => (!!t.source && t.source !== 'app') || BUILT_IN.test(t.name)

const fieldsOf = (t: DbTable) => t.columns.filter((c) => !c.isPrimaryKey).map((c) => c.name)

function Tables({ tables, icon: Icon, technical }: { tables: DbTable[]; icon: typeof Table2; technical: boolean }) {
  return (
    <RowStack>
      {tables.map((t) => {
        const fields = fieldsOf(t)
        return (
          <RowCard
            key={t.name}
            tile={<Icon className="size-5" />}
            title={asI18n(t.name)}
            caption={fields.length ? asI18n(fields.slice(0, SHOWN_FIELDS).join(', ') + (fields.length > SHOWN_FIELDS ? ' …' : '')) : m.database__no_fields()}
            note={t.columns.some((c) => c.classification === 'pii') ? m.database__personal() : undefined}
            below={
              technical ? (
                <TechDetails
                  rows={t.columns.map((c): [I18nString, string] => [
                    asI18n(c.name),
                    [c.type, c.isPrimaryKey ? m.database__tech_key() : '', c.foreignKey ? m.database__tech_links({ table: asI18n(c.foreignKey.table), column: asI18n(c.foreignKey.column) }) : ''].filter(Boolean).join(' · '),
                  ])}
                />
              ) : undefined
            }
          />
        )
      })}
    </RowStack>
  )
}

export function DatabaseScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const [technical] = useDeveloperDetails()
  const q = useProjectQuery<Schema>(key, 'console:getDbSchema', {})
  const head = <PageHead crumb={projectName} title={m.database__title()} text={m.database__text()} size="lead" />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.database__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const tables = (q.data?.tables ?? []).filter((t) => !HIDDEN.test(t.name)).sort((a, b) => a.name.localeCompare(b.name))
  const own = tables.filter((t) => !isBuiltIn(t))
  const builtIn = tables.filter(isBuiltIn)
  const ask = () => say(own.length ? m.database__ask_say() : m.database__add_say())
  const title = q.isPending ? m.database__hero_loading() : own.length === 0 ? m.database__hero_none() : own.length === 1 ? m.database__hero_one() : m.database__hero_many({ count: own.length })

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.database__title()} hue="sea" page="database" title={title} why={own.length ? m.database__why() : m.database__why_none()}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={ask}>
            <PikkuDot />
            {own.length ? m.database__hero_ask() : m.database__hero_add()}
          </Button>
        </div>
      </NextCard>

      {q.isPending ? (
        <WorkSkeleton />
      ) : tables.length === 0 ? (
        <EmptyState layout="row" icon={Database} title={m.database__empty()} text={m.database__empty_text()}>
          <Button type="button" size="page" onClick={ask}>
            <PikkuDot />
            {m.database__hero_add()}
          </Button>
        </EmptyState>
      ) : (
        <>
          {own.length ? (
            <Section title={m.database__yours()}>
              <Tables tables={own} icon={Table2} technical={technical} />
            </Section>
          ) : null}
          {builtIn.length ? (
            <Section title={m.database__built_in()} sub={m.database__built_in_text()}>
              <Tables tables={builtIn} icon={ShieldCheck} technical={technical} />
            </Section>
          ) : null}
        </>
      )}
    </Page>
  )
}
