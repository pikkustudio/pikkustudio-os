import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { Button } from '../ui/button'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { EmptyState } from '../blocks/EmptyState'
import { KeyRound } from 'lucide-react'
import { QueryState } from '../blocks/QueryState'
import { SecretForm } from '../blocks/SecretForm'
import { SecretsHero } from '../blocks/SecretsHero'
import { SecretsList } from '../blocks/SecretsList'
import { SecretActivity } from '../blocks/SecretActivity'
import { sealSecret } from '../lib/seal'
import { Link } from '@tanstack/react-router'
import { keep } from '../lib/links'

const Group = ({ title, children }: { title: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    {children}
  </section>
)

export function SecretsScreen() {
  const secrets = usePikkuQuery('vaultSecrets', {})
  const activity = usePikkuQuery('vaultActivity', { limit: 20 })
  const [editing, setEditing] = useState<{ name: string; fixed: boolean } | null>(null)
  const [sealFailed, setSealFailed] = useState(false)
  const refresh = () => {
    secrets.refetch()
    activity.refetch()
  }
  const put = usePikkuMutation('putVaultSecret', { onSuccess: refresh })
  const remove = usePikkuMutation('deleteVaultSecret', { onSuccess: refresh })

  const save = async (key: string, value: string) => {
    if (!secrets.data) return
    setSealFailed(false)
    try {
      const sealed = await sealSecret(secrets.data.publicKey, secrets.data.keyId, value)
      await put.mutateAsync({ key, sealed })
      setEditing(null)
    } catch {
      setSealFailed(true)
    }
  }

  const open = (name: string, fixed: boolean) => {
    setSealFailed(false)
    put.reset()
    setEditing({ name, fixed })
  }

  return (
    <Page gap="snug">
      <PageHead
        crumb={m.secrets_screen__crumb()}
        title={m.secrets_screen__title()}
        text={m.secrets_screen__text()}
        size="lead"
      />
      {secrets.data && !secrets.data.publicKey ? (
        <EmptyState icon={KeyRound} title={m.secrets_screen__elsewhere()} text={m.secrets_screen__elsewhere_text()}>
          <Button asChild size="page">
            <Link {...keep} to="/projects">
              {m.secrets_screen__elsewhere_action()}
            </Link>
          </Button>
        </EmptyState>
      ) : (
      <>
      <SecretsHero count={secrets.data?.secrets.length} onAdd={() => open('', false)} />
      <div>
        <div className="flex min-w-0 flex-col gap-6.5">
          <Group title={m.secrets_screen__saved()}>
            <QueryState
              query={secrets}
              skeleton={<div className="h-24 animate-pulse rounded-card border border-border bg-secondary" />}
              empty={(data) =>
                data.secrets.length ? null : (
                  <EmptyState layout="row" icon={KeyRound} title={m.secrets_screen__nothing_saved()} text={m.secrets_screen__nothing_saved_text()}>
                    <Button type="button" size="page" onClick={() => open('', false)}>
                      {m.secrets_screen__add_secret()}
                    </Button>
                  </EmptyState>
                )
              }
            >
              {(data) => (
                <SecretsList
                  names={data.secrets.map((s) => s.key)}
                  removing={remove.isPending}
                  onChange={(key) => open(key, true)}
                  onRemove={(key) => remove.mutate({ key })}
                />
              )}
            </QueryState>
            {remove.isError ? (
              <p role="alert" className="text-px15 text-destructive-foreground">
                {m.secrets_screen__remove_failed()}
              </p>
            ) : null}
          </Group>
          <Group title={m.secrets_screen__who_used()}>
            <QueryState query={activity} skeleton={<div className="h-24 animate-pulse rounded-card border border-border bg-secondary" />}>
              {(data) => <SecretActivity events={data.events} intact={data.intact} />}
            </QueryState>
          </Group>
        </div>
        {editing ? (
          <>
            <SecretForm
              key={`${editing.fixed}:${editing.name}`}
              name={editing.name}
              fixed={editing.fixed}
              saving={put.isPending}
              failed={sealFailed || put.isError}
              onName={(name) => setEditing({ name, fixed: false })}
              onSave={save}
              onClose={() => setEditing(null)}
            />
          </>
        ) : null}
      </div>
      </>
      )}
    </Page>
  )
}
