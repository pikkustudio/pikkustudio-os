import { useState, type ReactNode } from 'react'
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

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
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
        crumb="On this computer"
        title="Secrets"
        text="Passwords and keys your projects need. They are locked in your browser before they are saved, so nobody can read them back here. Projects ask for them when they run."
        size="lead"
      />
      <SecretsHero count={secrets.data?.secrets.length} onAdd={() => open('', false)} />
      <div>
        <div className="flex min-w-0 flex-col gap-6.5">
          <Group title="Saved secrets">
            <QueryState
              query={secrets}
              skeleton={<div className="h-24 animate-pulse rounded-card border border-border bg-secondary" />}
              empty={(data) =>
                data.secrets.length ? null : (
                  <EmptyState layout="row" icon={KeyRound} title="Nothing saved yet." text="Add a secret and your projects can use it.">
                    <Button type="button" size="page" onClick={() => open('', false)}>
                      Add a secret
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
                That could not be removed. Nothing was changed.
              </p>
            ) : null}
          </Group>
          <Group title="Who used them">
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
    </Page>
  )
}
