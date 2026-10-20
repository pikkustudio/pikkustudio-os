import { asI18n, type I18nNode } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, FolderInput } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SidePanel } from './SidePanel'
import { InlineAlert } from './InlineAlert'
import { PikkuDot } from './PikkuDot'
import { Spinner } from './Spinner'
import { ShellCtx } from '../lib/shell'
import { useImportProject } from '../lib/onboarding'

/** Where a host lets a project be brought in from, first in the panel (`from`), and how from a terminal (`developer`). */
export type BringFrom = { from?: I18nNode; developer?: I18nNode }

/** Bring in a project that already lives somewhere else: from the host's own source when it has one, or from a link. */
export function BringProjectPanel({ onClose, from, developer }: { onClose: () => void } & BringFrom) {
  const { say } = useContext(ShellCtx)
  const navigate = useNavigate()
  const client = useQueryClient()
  const bring = useImportProject()
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const hosted = !!from

  const opened = (project: string, team?: string) => {
    void client.invalidateQueries()
    navigate({ to: '/project' as never, search: ((prev: object) => ({ ...prev, run: undefined, path: undefined, ...(team ? { team } : {}), project })) as never })
  }

  const submit = () => {
    const address = url.trim()
    if (!address || bring.isPending) return
    bring.mutate({ url: address, ...(name.trim() ? { name: name.trim() } : {}) }, { onSuccess: (r) => opened(r.slug || r.key) })
  }

  return (
    <SidePanel icon={FolderInput} label={m.bring_project__title()} title={m.bring_project__title()} sub={m.bring_project__sub()} onClose={onClose}>
      {from ?? null}

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div>
          <h3 className="text-[17px] font-bold">{hosted ? m.bring_project__link_title_other() : m.bring_project__link_title()}</h3>
          <p className="mt-0.5 text-[15px] text-ink-2 text-pretty">{m.bring_project__link_text()}</p>
        </div>
        <label htmlFor="bring-url" className="text-[14px] font-bold">
          {m.bring_project__link_label()}
        </label>
        <Input
          id="bring-url"
          shape="pill"
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={m.bring_project__link_placeholder()}
          aria-invalid={bring.isError || undefined}
          className="h-12 border-[1.5px] border-input bg-card text-[16px]"
        />
        <label htmlFor="bring-name" className="text-[14px] font-bold">
          {m.bring_project__name_label()}
        </label>
        <Input
          id="bring-name"
          shape="pill"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={m.bring_project__name_placeholder()}
          className="h-12 border-[1.5px] border-input bg-card text-[16px]"
        />
        <p className="text-[14px] text-ink-2">{m.bring_project__stays_connected()}</p>
        <Button type="submit" variant={hosted ? 'bordered' : 'default'} size="page" className="self-start" disabled={!url.trim() || bring.isPending} aria-busy={bring.isPending || undefined}>
          {bring.isPending ? <Spinner /> : null}
          {bring.isPending ? m.bring_project__bringing() : m.bring_project__bring_it_in()}
          {bring.isPending ? null : <ArrowRight className="rtl:-scale-x-100 size-4.5" />}
        </Button>
        {bring.isError ? (
          <InlineAlert
            title={m.bring_project__failed_title()}
            body={bring.error.message ? asI18n(bring.error.message) : m.bring_project__failed_text()}
            action={
              <Button type="button" variant="bordered" size="compact" onClick={() => say(m.bring_project__failed_say({ url: url.trim() }))}>
                <PikkuDot />
                {m.bring_project__ask_pikku()}
              </Button>
            }
          />
        ) : null}
      </form>

      {developer ? (
        <details className="text-ink-2">
          <summary className="cursor-pointer text-[14px] font-bold">{m.bring_project__developer_details()}</summary>
          <div className="mt-3 flex flex-col gap-3">
            {developer}
          </div>
        </details>
      ) : null}
    </SidePanel>
  )
}
