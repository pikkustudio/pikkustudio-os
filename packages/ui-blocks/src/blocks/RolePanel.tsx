import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState, type FormEvent } from 'react'
import { ShieldCheck, ShieldPlus, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { SidePanel } from './SidePanel'
import { FixNotice } from './FixNotice'
import { useProjectAction } from '../lib/projectRpc'
import { useDeveloperDetails } from '../lib/developer-details'
import { coveredBy, depthOf, isAllowed, plainName, sameSet, togglePermission, type DeclaredPermission, type Role } from '../lib/permissions'

const INDENT = ['', 'ps-6', 'ps-12', 'ps-18']
const ROLES = ['admin:scopeListRoles']

export function RolePanel({ projectKey, role, declared, taken, onClose }: { projectKey: string; role: Role | null; declared: DeclaredPermission[]; taken: string[]; onClose: () => void }) {
  const isNew = role === null
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<string[]>(role?.scopes ?? [])
  const [technical] = useDeveloperDetails()
  const [confirming, setConfirming] = useState(false)
  const create = useProjectAction<{ name: string; description?: string; scopes: string[] }>(projectKey, 'admin:scopeCreateRole', ROLES)
  const update = useProjectAction<{ name: string; scopes: string[] }>(projectKey, 'admin:scopeSetRoleScopes', ROLES)
  const remove = useProjectAction<{ name: string }>(projectKey, 'admin:scopeDeleteRole', ROLES)
  const busy = create.isPending || update.isPending || remove.isPending
  const failed = create.error ?? update.error ?? remove.error
  const trimmed = name.trim()
  const clash = isNew && taken.some((t) => t.toLowerCase() === trimmed.toLowerCase())
  const changed = isNew ? !!trimmed && !clash : !sameSet(selected, role.scopes)
  const shown = declared.filter((p) => p.declared || selected.includes(p.id))
  const title = isNew ? m.permissions_panel__new_title() : asI18n(role.name)

  const clear = () => {
    create.reset()
    update.reset()
    remove.reset()
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!changed || busy) return
    clear()
    if (isNew) create.mutate({ name: trimmed, ...(description.trim() ? { description: description.trim() } : {}), scopes: selected }, { onSuccess: onClose })
    else update.mutate({ name: role.name, scopes: selected }, { onSuccess: onClose })
  }

  const erase = () => {
    if (isNew) return
    clear()
    remove.mutate({ name: role.name }, { onSuccess: onClose })
  }

  return (
    <SidePanel
      icon={isNew ? ShieldPlus : ShieldCheck}
      title={title}
      sub={isNew ? m.permissions_panel__new_sub() : role.description ? asI18n(role.description) : m.permissions_panel__edit_sub()}
      label={title}
      onClose={onClose}
    >
      <form onSubmit={save} className="flex flex-col gap-4.5">
        {isNew ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-px13 font-bold text-muted-foreground">{m.permissions_panel__name()}</span>
              <Input shape="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.permissions_panel__name_hint()} aria-invalid={clash || undefined} autoComplete="off" autoFocus />
              {clash ? <small className="text-px14 text-destructive-foreground">{m.permissions_panel__name_taken()}</small> : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-px13 font-bold text-muted-foreground">{m.permissions_panel__description()}</span>
              <Textarea tone="field" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={m.permissions_panel__description_hint()} />
            </label>
          </>
        ) : null}

        <section className="flex flex-col gap-2" aria-label={m.permissions_panel__can_do()}>
          <h3 className="font-heading text-[18px] font-bold">{m.permissions_panel__can_do()}</h3>
          {shown.length === 0 ? (
            <p className="text-px15 text-ink-2">{m.permissions_panel__nothing_declared()}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
              {shown.map((p) => {
                const parent = coveredBy(selected, p.id)
                const held = selected.includes(p.id)
                const locked = busy || !!parent || (!p.declared && !held)
                return (
                  <li key={p.id} className={INDENT[Math.min(depthOf(p.id), 3)]}>
                    <label className={`flex gap-3 px-4 py-3 ${locked ? '' : 'cursor-pointer hover:bg-secondary'}`}>
                      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={isAllowed(selected, p.id)} disabled={locked} onChange={() => setSelected((s) => togglePermission(s, p.id))} />
                      <span className="min-w-0 text-px16">
                        <span className="block">{asI18n(plainName(p))}</span>
                        {parent ? <small className="block text-px14 text-ink-2">{m.permissions_panel__included_by({ name: asI18n(plainName(declared.find((d) => d.id === parent) ?? { id: parent })) })}</small> : null}
                        {!p.declared ? <small className="block text-px14 text-warning-foreground">{m.permissions_panel__unused()}</small> : null}
                        {technical ? <code className="block text-px13 break-all text-muted-foreground">{asI18n(p.id)}</code> : null}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {failed ? (
          <FixNotice
            title={m.permissions_panel__failed_title()}
            body={m.permissions_panel__failed_body()}
            ask={m.permissions_panel__failed_ask({ name: asI18n(isNew ? trimmed : role.name), details: asI18n(failed instanceof Error ? failed.message : '') })}
            onRetry={clear}
          />
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" variant="default" size="compact" disabled={!changed || busy} aria-busy={create.isPending || update.isPending}>
            {isNew ? m.permissions_panel__create() : m.permissions_panel__save()}
          </Button>
          <Button type="button" variant="ghost" size="compactTight" onClick={onClose}>
            {m.permissions_panel__cancel()}
          </Button>
        </div>
      </form>

      {isNew ? null : (
        <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4.5">
          <p className="text-px15 text-ink-2">{m.permissions_panel__remove_explain()}</p>
          {confirming ? (
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="destructive" size="page" disabled={busy} aria-busy={remove.isPending} onClick={erase}>
                {m.permissions_panel__remove_confirm({ name: asI18n(role.name) })}
              </Button>
              <Button type="button" variant="bordered" size="page" onClick={() => setConfirming(false)}>
                {m.permissions_panel__keep()}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="bordered" size="page" className="self-start" disabled={busy} onClick={() => setConfirming(true)}>
              <Trash2 className="size-4.5" />
              {m.permissions_panel__remove()}
            </Button>
          )}
        </div>
      )}
    </SidePanel>
  )
}
