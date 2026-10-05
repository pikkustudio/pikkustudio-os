import { useState } from 'react'
import { EmailBar } from './EmailBar'
import { EmailPanel } from './EmailPanel'
import type { Device } from './EmailPreview'
import { EmailStage } from './EmailStage'
import { useEmailPreview } from '../lib/emails'
import type { Copy, EmailsData, Field, Lang } from '../types/emails'

export function EmailDetail({ projectKey, data, id, lang, device, onBack, onLang, onDevice, onPick }: { projectKey: string; data: EmailsData; id: string; lang: Lang; device: Device; onBack: () => void; onLang: (l: Lang) => void; onDevice: (d: Device) => void; onPick: (id: string) => void }) {
  const { emails, langs, fields } = data
  const e = emails.find((x) => x.id === id) ?? emails[0]
  const start = Object.fromEntries(e.ph.map((k) => [k, fields[k]?.start ?? ''])) as Record<Field, string>
  const [vals, setVals] = useState<Record<Field, string>>(start)
  const [reloadKey, setReloadKey] = useState(0)
  const shown: Lang = e.locales.includes(lang) ? lang : (e.locales[0] ?? lang)
  const preview = useEmailPreview(projectKey, e.id, shown, vals)
  const copy: Copy = { s: preview.data?.subject ?? '', b: [], c: '' }
  return (
    <div className="flex h-full flex-col gap-3">
      <EmailBar
        id={e.id}
        emails={emails}
        device={device}
        lang={shown}
        langs={langs}
        missing={Object.keys(langs).filter((l) => !e.locales.includes(l))}
        onPick={onPick}
        onBack={onBack}
        onDevice={onDevice}
        onLang={onLang}
        onReload={() => {
          setReloadKey((k) => k + 1)
          preview.refetch()
        }}
      />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-3.5">
        <EmailStage preview={preview.data} device={device} reloadKey={reloadKey} />
        <EmailPanel
          email={e}
          fields={fields}
          langs={langs}
          lang={shown}
          copy={copy}
          vals={vals}
          onCopy={() => {}}
          onVal={(k, v) => setVals((x) => ({ ...x, [k]: v }))}
          onReset={() => setVals(start)}
        />
      </div>
    </div>
  )
}
