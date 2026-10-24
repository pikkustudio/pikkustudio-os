import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectAction, useProjectQuery } from '../lib/projectRpc'
import { isMissing } from '../lib/i18n'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { TransRows } from '../blocks/TransRows'
import { EmptyState } from '../blocks/EmptyState'
import { Languages } from 'lucide-react'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { detailsOf, faultOf } from '../blocks/ErrorState'
import { FixNotice } from '../blocks/FixNotice'
import { HintRow } from '../blocks/HintRow'
import { appWrites, isVariant, type I18nApp, type WordingWrite } from '../lib/wordingWrite'
import { AskPikku } from '../blocks/AskPikku'
import type { TransString } from '../types/translations'

function Editor({ app, projectKey }: { app: I18nApp; projectKey: string }) {
  const write = useProjectAction<WordingWrite>(projectKey, 'console:writeI18nLocale', ['console:getI18n'])
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [failed, setFailed] = useState<{ error: unknown; locale: string } | null>(null)
  const timers = useRef<Record<string, number>>({})
  const latest = useRef(app)
  latest.current = app
  useEffect(() => () => Object.values(timers.current).forEach(window.clearTimeout), [])
  const locales = Object.keys(app.locales).filter((l) => l !== app.baseLocale)
  const base = app.locales[app.baseLocale] ?? {}
  const variants = Object.keys(base).filter((id) => isVariant(app, id))
  const text = (locale: string, id: string) => {
    const value = drafts[locale]?.[id] ?? app.locales[locale]?.[id]
    return typeof value === 'string' && !isMissing(value) ? value : ''
  }
  const items: TransString[] = useMemo(
    () =>
      Object.entries(base)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && !isVariant(app, entry[0]))
        .map(([id, original]) => ({ id, base: original, values: Object.fromEntries(locales.map((l) => [l, text(l, id)])) })),
    [app, drafts],
  )
  const save = async (locale: string, edits: Record<string, string>) => {
    try {
      for (const one of appWrites(latest.current, Object.entries(edits).map(([key, value]) => ({ key, locale, value })))) await write.mutateAsync(one)
      setFailed(null)
    } catch (error) {
      setFailed({ error, locale })
    }
  }
  const set = (id: string, locale: string, value: string) => {
    const next = { ...drafts[locale], [id]: value }
    setDrafts((d) => ({ ...d, [locale]: next }))
    window.clearTimeout(timers.current[locale])
    timers.current[locale] = window.setTimeout(() => void save(locale, next), 700)
  }
  const keys = asI18n(variants.join(', '))
  return (
    <>
      {variants.length ? (
        <HintRow icon={Languages}>
          <span className="flex flex-col items-start gap-2">
            {m.translations_screen__variants({ keys })}
            <AskPikku label={m.translations_screen__variants_ask()} prompt={m.translations_screen__variants_say({ keys })} />
          </span>
        </HintRow>
      ) : null}
      {failed ? (
        <FixNotice
          title={m.action_notice__title()}
          body={m.live_save__failed()}
          ask={m.error_state__fix_ask_what({ what: m.translations_screen__save_failed_what(), details: asI18n(detailsOf(faultOf(failed.error), m.translations_screen__save_failed_what())) })}
          onRetry={() => void save(failed.locale, drafts[failed.locale] ?? {})}
          retrying={write.isPending}
        />
      ) : null}
      {locales.length ? (
        <TransRows items={items} locales={locales} baseLocale={app.baseLocale} set={set} />
      ) : (
        <EmptyState layout="row" icon={Languages} title={m.translations_screen__one_language()} text={m.translations_screen__one_language_text()}>
          <AskPikku label={m.translations_screen__add_language()} prompt={m.translations_screen__i_would_like_to_add()} />
        </EmptyState>
      )}
    </>
  )
}

const missingFunction = (error: unknown) => {
  const f = faultOf(error)
  return f.status === 404 || /^NotFound/.test(f.name ?? '') || /getI18n|not found|no such function/i.test(f.message ?? '')
}

export function TranslationsScreen() {
  const projectName = useProjectName()
  const key = useProjectKey()
  const apps = useProjectQuery<{ apps: I18nApp[] }>(key, 'console:getI18n')
  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.translations_screen__title()} text={m.translations_screen__text()} />
      {apps.isError && missingFunction(apps.error) ? (
        <EmptyState layout="row" icon={Languages} title={m.translations_screen__old_pikku()}>
          <AskPikku label={m.translations_screen__old_pikku_ask()} prompt={m.translations_screen__old_pikku_message()} />
        </EmptyState>
      ) : (
      <QueryState query={apps} skeleton={<CardsSkeleton count={2} />}>
        {(data) => {
          const app = data.apps.find((a) => Object.keys(a.locales).length > 1) ?? data.apps[0]
          return app ? (
            <div className="@container flex flex-col gap-5">
              <Editor key={app.app} app={app} projectKey={key} />
            </div>
          ) : (
            <EmptyState layout="row" icon={Languages} title={m.translations_screen__nothing()} text={m.translations_screen__nothing_text()} />
          )
        }}
      </QueryState>
      )}
    </Page>
  )
}
