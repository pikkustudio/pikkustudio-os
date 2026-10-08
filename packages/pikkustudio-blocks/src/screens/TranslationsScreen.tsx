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
import { faultOf } from '../blocks/ErrorState'
import { AskPikku } from '../blocks/AskPikku'
import type { TransString } from '../types/translations'

type Catalog = Record<string, string>
type I18nApp = { app: string; baseLocale: string; defaultLocale: string | null; locales: Record<string, Catalog> }

function Editor({ app, projectKey }: { app: I18nApp; projectKey: string }) {
  const write = useProjectAction<{ app: string; locale: string; content: Catalog }>(projectKey, 'console:writeI18nLocale', ['console:getI18n'])
  const [drafts, setDrafts] = useState<Record<string, Catalog>>({})
  const timers = useRef<Record<string, number>>({})
  useEffect(() => () => Object.values(timers.current).forEach(window.clearTimeout), [])
  const locales = Object.keys(app.locales).filter((l) => l !== app.baseLocale)
  const merged = (locale: string): Catalog => ({ ...app.locales[locale], ...drafts[locale] })
  const items: TransString[] = useMemo(
    () =>
      Object.entries(app.locales[app.baseLocale] ?? {}).map(([id, base]) => ({
        id,
        base,
        values: Object.fromEntries(locales.map((l) => [l, isMissing(merged(l)[id]) ? '' : merged(l)[id]!])),
      })),
    [app, drafts],
  )
  const set = (id: string, locale: string, value: string) => {
    const next = { ...merged(locale), [id]: value }
    setDrafts((d) => ({ ...d, [locale]: next }))
    window.clearTimeout(timers.current[locale])
    timers.current[locale] = window.setTimeout(() => write.mutate({ app: app.app, locale, content: next }), 700)
  }
  if (!locales.length)
    return (
      <EmptyState layout="row" icon={Languages} title={m.translations_screen__one_language()} text={m.translations_screen__one_language_text()}>
        <AskPikku label={m.translations_screen__add_language()} prompt={m.translations_screen__i_would_like_to_add()} />
      </EmptyState>
    )
  return <TransRows items={items} locales={locales} baseLocale={app.baseLocale} set={set} />
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
