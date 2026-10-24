import { asI18n } from '@pikku/react'
import { useContext, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Globe } from 'lucide-react'
import { m } from '@/i18n/messages'
import { ShellCtx } from '../lib/shell'
import { Button } from '../ui/button'
import { ErrorState, detailsOf, faultOf } from './ErrorState'
import { FixNotice } from './FixNotice'
import { PikkuDot } from './PikkuDot'
import { HintNote } from './HintNote'
import { olderPikku, useSaveWording, variantWording } from './liveSave'
import { HintRow } from './HintRow'
import { StatusLine } from './StatusLine'
import { TranslationPanel, languageName } from './TranslationPanel'
import { askLiveApp, type Wording } from './LiveAppFrame'

export function LiveWordingPanel({ wordingKey, reloadKey }: { wordingKey: string | null; reloadKey: number }) {
  const { say } = useContext(ShellCtx)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const client = useQueryClient()
  const save = useSaveWording()
  const wording = useQuery({
    enabled: !!wordingKey,
    queryKey: ['live-wording', wordingKey, reloadKey],
    queryFn: () => askLiveApp<Wording>('i18n-values', { key: wordingKey }),
    retry: false,
    staleTime: 0,
  })
  if (!wordingKey) return <HintRow icon={Globe}>{m.design_workbench__click_any_underlined_wording()}</HintRow>
  if (wording.isPending) return <StatusLine text={m.live_wording__reading()} />
  if (wording.isError) return <ErrorState error={wording.error} what={m.live_wording__what()} onRetry={() => void wording.refetch()} retrying={wording.isFetching} />
  const found = wording.data
  if (found.variant || variantWording(save.error))
    return (
      <>
        <HintNote>{m.live_wording__variant()}</HintNote>
        <Button variant="bordered" size="compact" type="button" className="self-start" onClick={() => say(m.live_wording__variant_say({ key: asI18n(wordingKey) }))}>
          <PikkuDot />
          {m.live_wording__variant_ask()}
        </Button>
      </>
    )
  const entry = Object.fromEntries(found.locales.map((locale) => [locale, draft[locale] ?? found.values[locale] ?? '']))
  const changed = found.locales.filter((locale) => draft[locale] !== undefined && draft[locale] !== (found.values[locale] ?? ''))
  const request = m.live_wording__save_say({ key: asI18n(wordingKey), changes: asI18n(changed.map((locale) => `${languageName(locale)}: “${draft[locale]}”`).join('; ')) })
  const keep = () => {
    say(request)
    setSent(true)
  }
  const store = () =>
    save.mutate(
      { wordingKey, changes: Object.fromEntries(changed.map((locale) => [locale, draft[locale]!])) },
      { onSuccess: () => void client.invalidateQueries({ queryKey: ['project'] }) },
    )
  return (
    <>
      <TranslationPanel
        locales={found.locales}
        entry={entry}
        onEdit={(locale, value) => {
          setSent(false)
          save.reset()
          setDraft((d) => ({ ...d, [locale]: value }))
        }}
      />
      {save.isError ? (
        <FixNotice
          title={m.action_notice__title()}
          body={olderPikku(save.error) ? m.live_save__old_pikku() : m.live_save__failed()}
          ask={olderPikku(save.error) ? request : m.error_state__fix_ask_what({ what: m.live_wording__saving_what(), details: asI18n(detailsOf(faultOf(save.error), m.live_wording__saving_what())) })}
          onRetry={store}
          retrying={save.isPending}
        />
      ) : null}
      {save.isSuccess ? <StatusLine tone="ok" text={m.live_wording__saved()} /> : sent ? <StatusLine tone="ok" text={m.live_look__sent()} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="default" size="compact" type="button" disabled={changed.length === 0 || save.isPending || save.isSuccess} aria-busy={save.isPending} onClick={store}>
          {save.isPending ? m.live_save__saving() : m.live_wording__save_now()}
        </Button>
        <Button variant="bordered" size="compact" type="button" disabled={changed.length === 0 || sent} onClick={keep}>
          <PikkuDot />
          {m.live_wording__save()}
        </Button>
      </div>
    </>
  )
}
