import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { Search, ToggleRight, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch as Toggle } from '../ui/switch'
import { SidePanel } from './SidePanel'
import { Dot } from './RowCard'
import { FixNotice } from './FixNotice'
import { InfoNote } from './InfoNote'
import { RangeField } from './RangeField'
import { Segmented } from './Segmented'
import { switchWords } from './SwitchRow'
import { useProjectAction, useProjectQuery } from '../lib/projectRpc'
import { accountName, type AccountsPage } from '../lib/accounts'
import { everyone, subjectOf, switchTitle, type Switch, type SwitchExceptions, type SwitchSubject } from '../lib/switches'
import { useDeveloperDetails } from '../lib/developer-details'

const Label = ({ children }: { children: I18nString }) => <h3 className="text-px14 font-bold text-muted-foreground">{children}</h3>

export function SwitchPanel({ projectKey, item, canChange, onChanged, onClose }: { projectKey: string; item: Switch; canChange: boolean; onChanged: () => void; onClose: () => void }) {
  const [technical] = useDeveloperDetails()
  const [some, setSome] = useState(!everyone(item))
  const [percent, setPercent] = useState(item.rolloutPercent ?? 50)
  const [term, setTerm] = useState('')
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null)
  const exceptions = useProjectQuery<SwitchExceptions>(projectKey, 'admin:flagOverrides', { name: item.name })
  const people = useProjectQuery<AccountsPage>(projectKey, 'admin:listUsers', { limit: 200, offset: 0 }, { optional: true })
  const search = term.trim()
  const found = useProjectQuery<AccountsPage>(projectKey, 'admin:listUsers', { limit: 6, offset: 0, search }, { enabled: search.length >= 2 })
  const setEnabled = useProjectAction<{ name: string; enabled: boolean }>(projectKey, 'admin:flagSetEnabled', ['admin:flagList'])
  const setRollout = useProjectAction<{ name: string; percent: number | null }>(projectKey, 'admin:flagSetRollout', ['admin:flagList'])
  const setOverride = useProjectAction<{ name: string; subject: SwitchSubject; enabled: boolean }>(projectKey, 'admin:flagSetOverride', ['admin:flagOverrides'])
  const clearOverride = useProjectAction<{ name: string; subject: SwitchSubject }>(projectKey, 'admin:flagClearOverride', ['admin:flagOverrides'])
  const busy = setEnabled.isPending || setRollout.isPending || setOverride.isPending || clearOverride.isPending
  const failed = setEnabled.error ?? setRollout.error ?? setOverride.error ?? clearOverride.error
  const title = asI18n(switchTitle(item.name))
  const words = switchWords(item)
  const saved = item.rolloutPercent === null ? null : item.rolloutPercent >= 100 ? null : item.rolloutPercent
  const wanted = some ? percent : null
  const dirty = wanted !== saved
  const nameOf = (id: string) => {
    const person = people.data?.users.find((u) => u.id === id)
    return person ? accountName(person) : null
  }
  const reset = () => {
    setEnabled.reset()
    setRollout.reset()
    setOverride.reset()
    clearOverride.reset()
  }
  const pin = (enabled: boolean) => {
    if (!picked) return
    reset()
    setOverride.mutate({ name: item.name, subject: { userId: picked.id }, enabled }, { onSuccess: () => { setPicked(null); setTerm('') } })
  }

  return (
    <SidePanel icon={ToggleRight} title={title} sub={item.description ? asI18n(item.description) : undefined} label={m.switches_panel__label()} onClose={onClose}>
      <Dot tone={words.tone}>{words.text}</Dot>
      {!item.declared ? <InfoNote text={m.switches_panel__unused_note()} /> : !item.backed ? <InfoNote text={m.switches_panel__unset_note()} /> : null}
      {failed ? (
        <FixNotice
          title={m.switches_panel__failed_title()}
          body={m.switches_panel__failed_body()}
          ask={m.switches_panel__failed_ask({ name: title, details: asI18n(failed instanceof Error ? failed.message : '') })}
          onRetry={reset}
        />
      ) : null}

      <Label>{m.switches_panel__who()}</Label>
      <Toggle
        checked={item.enabled}
        disabled={!canChange || busy}
        aria-busy={setEnabled.isPending}
        onCheckedChange={(enabled) => {
          reset()
          setEnabled.mutate({ name: item.name, enabled }, { onSuccess: onChanged })
        }}
      >
        {item.enabled ? m.switches_panel__is_on() : m.switches_panel__is_off()}
      </Toggle>
      <p className="text-px15 text-ink-2">{item.enabled ? m.switches_panel__on_explain() : m.switches_panel__off_explain()}</p>

      {item.enabled ? (
        <>
          <Segmented
            label={m.switches_panel__how_many()}
            value={some ? 'some' : 'all'}
            options={[
              ['all', m.switches_panel__everyone(), !canChange],
              ['some', m.switches_panel__some(), !canChange],
            ]}
            onChange={(v) => setSome(v === 'some')}
          />
          {some ? (
            <>
              <RangeField label={m.switches_panel__how_many()} min={0} max={100} step={5} value={percent} unit="%" onChange={setPercent} />
              <p className="text-px15 text-ink-2">{m.switches_panel__some_explain({ percent })}</p>
            </>
          ) : null}
          {dirty && canChange ? (
            <Button
              type="button"
              variant="default"
              size="page"
              className="self-start"
              disabled={busy}
              aria-busy={setRollout.isPending}
              onClick={() => {
                reset()
                setRollout.mutate({ name: item.name, percent: wanted }, { onSuccess: onChanged })
              }}
            >
              {m.switches_panel__save()}
            </Button>
          ) : null}
        </>
      ) : null}

      <Label>{m.switches_panel__exceptions()}</Label>
      <p className="-mt-2 text-px15 text-ink-2">{m.switches_panel__exceptions_explain()}</p>
      {exceptions.isPending ? (
        <div className="h-14 animate-pulse rounded-xl bg-secondary" />
      ) : exceptions.isError ? (
        <FixNotice
          title={m.switches_panel__exceptions_failed()}
          body={m.switches_screen__failed_body()}
          ask={m.switches_panel__exceptions_failed_say({ name: title, details: asI18n(exceptions.error instanceof Error ? exceptions.error.message : '') })}
          onRetry={() => exceptions.refetch()}
          retrying={exceptions.isFetching}
        />
      ) : !exceptions.data.supported ? (
        <p className="text-px15 text-ink-2">{m.switches_panel__exceptions_elsewhere()}</p>
      ) : (
        <>
          {exceptions.data.overrides.length === 0 ? <p className="text-px15 text-ink-2">{m.switches_panel__exceptions_none()}</p> : null}
          <div className="flex flex-col gap-2">
            {exceptions.data.overrides.map((o) => {
              const name = o.subjectKind === 'organization' ? m.switches_panel__a_team() : nameOf(o.subjectId) ? asI18n(nameOf(o.subjectId)!) : m.switches_panel__a_person()
              return (
                <div key={`${o.subjectKind}:${o.subjectId}`} className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-px15">{name}</b>
                    <small className="block text-px13 text-ink-2">{o.enabled ? m.switches_panel__always_on() : m.switches_panel__always_off()}</small>
                    {technical ? <code dir="ltr" className="block font-mono text-px13 break-all text-ink-2">{asI18n(o.subjectId)}</code> : null}
                  </span>
                  {canChange ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="compactTight"
                      disabled={busy}
                      aria-label={m.switches_panel__remove_exception({ name })}
                      onClick={() => {
                        reset()
                        clearOverride.mutate({ name: item.name, subject: subjectOf(o.subjectKind, o.subjectId) })
                      }}
                    >
                      <X className="size-4" />
                      {m.switches_panel__remove()}
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
          {canChange ? (
            picked ? (
              <div className="flex flex-col gap-3 rounded-xl bg-secondary p-4">
                <b className="text-px15">{asI18n(picked.name)}</b>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="bordered" size="compact" disabled={busy} aria-busy={setOverride.isPending} onClick={() => pin(true)}>
                    {m.switches_panel__make_always_on()}
                  </Button>
                  <Button type="button" variant="bordered" size="compact" disabled={busy} aria-busy={setOverride.isPending} onClick={() => pin(false)}>
                    {m.switches_panel__make_always_off()}
                  </Button>
                  <Button type="button" variant="ghost" size="compact" onClick={() => setPicked(null)}>
                    {m.switches_panel__cancel()}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute top-1/2 start-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    type="search"
                    shape="pill"
                    className="h-12 border-[1.5px] border-input bg-field ps-10.5 text-px16 shadow-none md:text-px16"
                    placeholder={m.switches_panel__find_person()}
                    aria-label={m.switches_panel__find_person()}
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  />
                </div>
                {search.length >= 2 && found.data ? (
                  found.data.users.length ? (
                    found.data.users.map((u) => (
                      <Button key={u.id} type="button" variant="soft" size="profile" className="rounded-xl" onClick={() => setPicked({ id: u.id, name: accountName(u) })}>
                        <span className="min-w-0 flex-1 text-start">
                          <b className="block truncate text-px15">{asI18n(accountName(u))}</b>
                          <small className="block truncate text-px13 text-ink-2">{asI18n(u.email)}</small>
                        </span>
                      </Button>
                    ))
                  ) : (
                    <p className="text-px15 text-ink-2">{m.switches_panel__nobody_found()}</p>
                  )
                ) : null}
              </div>
            )
          ) : null}
        </>
      )}

      {technical ? (
        <div className="flex flex-col gap-1.5 rounded-xl bg-secondary p-4">
          <p className="text-px14 text-ink-2">{m.switches_panel__called()}</p>
          <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(item.name)}</code>
          {item.anyOf?.length ? (
            <>
              <p className="pt-2 text-px14 text-ink-2">{m.switches_panel__any_of()}</p>
              <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(item.anyOf.join(', '))}</code>
            </>
          ) : null}
        </div>
      ) : null}
    </SidePanel>
  )
}
