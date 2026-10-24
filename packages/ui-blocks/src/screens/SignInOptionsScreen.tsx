import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { KeyRound, LogIn } from 'lucide-react'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { PikkuDot } from '../blocks/PikkuDot'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { TechDetails } from '../blocks/TechDetails'
import { useDeveloperDetails } from '../lib/developer-details'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { ShellCtx } from '../lib/shell'
import { WorkSkeleton } from './work-shared'

type Providers = { providers: { id: string; displayName: string; secretId: string }[]; plugins: { id: string; displayName: string }[]; hasCredentials: boolean }

export function SignInOptionsScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const [technical] = useDeveloperDetails()
  const q = useProjectQuery<Providers>(key, 'console:getAuthProviders', {})
  const head = <PageHead crumb={projectName} title={m.signin_options__title()} text={m.signin_options__text()} size="lead" developerDetails />

  if (q.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={q.error} what={m.signin_options__title()} onRetry={() => void q.refetch()} retrying={q.isFetching} />
      </Page>
    )

  const providers = q.data?.providers ?? []
  const plugins = q.data?.plugins ?? []
  const count = providers.length + plugins.length
  const ready = !!q.data?.hasCredentials
  const ask = () => say(count ? (ready ? m.signin_options__ask_say() : m.signin_options__keys_say()) : m.signin_options__add_say())
  const title = q.isPending ? m.signin_options__hero_loading() : count === 0 ? m.signin_options__hero_none() : count === 1 ? m.signin_options__hero_one() : m.signin_options__hero_many({ count })
  const why = count === 0 ? m.signin_options__why_none() : providers.length && !ready ? m.signin_options__why_keys() : m.signin_options__why()

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.signin_options__title()} hue="petrol" page="sign-in-options" title={title} why={why}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={ask}>
            <PikkuDot />
            {count === 0 ? m.signin_options__hero_add() : providers.length && !ready ? m.signin_options__hero_keys() : m.signin_options__hero_ask()}
          </Button>
        </div>
      </NextCard>

      {q.isPending ? (
        <WorkSkeleton />
      ) : count === 0 ? (
        <EmptyState layout="row" icon={LogIn} title={m.signin_options__empty()} text={m.signin_options__empty_text()}>
          <Button type="button" size="page" onClick={ask}>
            <PikkuDot />
            {m.signin_options__hero_add()}
          </Button>
        </EmptyState>
      ) : (
        <RowStack>
          {providers.map((p) => (
            <RowCard
              key={p.id}
              flag={!ready}
              tile={<LogIn className="size-5" />}
              title={asI18n(p.displayName)}
              caption={ready ? m.signin_options__ready_text() : m.signin_options__needs_text()}
              below={technical ? <TechDetails rows={[[m.signin_options__tech_id(), p.id], [m.signin_options__tech_secret(), p.secretId]]} /> : undefined}
            >
              <Dot tone={ready ? 'ok' : 'warn'}>{ready ? m.signin_options__ready() : m.signin_options__needs()}</Dot>
            </RowCard>
          ))}
          {plugins.map((p) => (
            <RowCard
              key={p.id}
              tile={<KeyRound className="size-5" />}
              title={asI18n(p.displayName)}
              caption={m.signin_options__extra_text()}
              below={technical ? <TechDetails rows={[[m.signin_options__tech_id(), p.id]]} /> : undefined}
            >
              <Dot tone="quiet">{m.signin_options__extra()}</Dot>
            </RowCard>
          ))}
        </RowStack>
      )}
    </Page>
  )
}
