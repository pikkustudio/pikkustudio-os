import { useEffect, useState, type ReactNode } from 'react'
import { createRootRoute, HeadContent, Outlet, Scripts, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PikkuProvider, createPikku } from '@pikku/react'
import { DirectionProvider } from '@radix-ui/react-direction'
import { ChatTransportCtx, fetchTransport } from '@pikkustudio/blocks/lib/chat'
import { ProjectRpcCtx } from '@pikkustudio/blocks/lib/projectRpc'
import { projectInvoke } from '@/lib/projectRpc'
import { PikkuFetch } from '@project/functions-sdk/pikku/pikku-fetch.gen'
import { PikkuRPC } from '@project/functions-sdk/pikku/pikku-rpc.gen'
import { LOCALE_KEY, defaultLocale, localeDir, supportedLocales, setActiveLocale, useLocale } from '@/i18n/config'
import { appMeta } from '@/app-meta'
import { apiUrl } from '@/lib/env'
import { localeFetch } from '@/lib/locale-fetch'
import { PreferencesContext } from '@/contexts/preferences'
import { DefaultErrorPage } from '@/components/DefaultErrorPage'
import { DefaultNotFoundPage } from '@/components/DefaultNotFoundPage'
import { SlotsCtx } from '@pikkustudio/blocks/lib/slots'
import { TeamGuard } from '@pikkustudio/blocks/blocks/TeamGuard'
import { useAccount } from '@pikkustudio/blocks/lib/onboarding'
import { StudioLoading } from '@pikkustudio/blocks/blocks/StudioLoading'
import { validateStudioSearch } from '@pikkustudio/blocks/lib/search'
import { paletteScript, schemeScript } from '@pikkustudio/theme'
import globals from '@/styles/globals.css?url'

export const Route = createRootRoute({
  validateSearch: validateStudioSearch,
  head: () => ({ meta: appMeta, links: [{ rel: 'stylesheet', href: globals }] }),
  notFoundComponent: DefaultNotFoundPage,
  errorComponent: (props: ErrorComponentProps) => (
    <RootDocument>
      <DefaultErrorPage {...props} />
    </RootDocument>
  ),
  component: () => (
    <RootDocument>
      <Outlet />
    </RootDocument>
  ),
})


// Same for language and direction: a saved Arabic (RTL) choice sets <html lang dir> before first paint, so the page
// never flashes left-to-right. The server cannot know the saved choice (it lives in this browser), so it renders the
// project's default locale and this script, then the effect in RootDocument, take over on the client.
const RTL_LOCALES = supportedLocales.filter((l) => localeDir(l) === 'rtl')
const localeScript = `try{var l=localStorage.getItem('${LOCALE_KEY}')||localStorage.getItem('app-locale');if(l&&${JSON.stringify(supportedLocales)}.indexOf(l)>-1){var d=document.documentElement;d.lang=l;d.dir=${JSON.stringify(RTL_LOCALES)}.indexOf(l)>-1?'rtl':'ltr'}}catch(e){}`

function SessionGate({ children }: { children: ReactNode }) {
  const account = useAccount()
  if (account.isPending) return <StudioLoading />
  return (
    <SlotsCtx.Provider value={{}}>
      <TeamGuard>{children}</TeamGuard>
    </SlotsCtx.Provider>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  const [locale, setLocaleRaw] = useState<string>(defaultLocale)
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: (count) => count < 3 } } }))
  const [pikku] = useState(() => {
    const client = createPikku(PikkuFetch, PikkuRPC, { serverUrl: apiUrl(), credentials: 'include', fetch: localeFetch })
    const invoke = client.rpc.invoke.bind(client.rpc) as (name: string, data?: unknown) => Promise<unknown>
    client.rpc.invoke = ((name: string, data: unknown) =>
      name.startsWith('studio:') ? client.fetch.post(`/studio/${name.slice(7)}` as never, data as never) : invoke(name, data)) as typeof client.rpc.invoke
    return client
  })
  const [chatTransport] = useState(() => fetchTransport(apiUrl()))
  const router = useRouter()
  // The reactive locale store, not the local state: a language switch anywhere in the app (account screen, login) goes
  // through setActiveLocale, and portals (menus, tooltips) must follow it.
  const { locale: active, dir } = useLocale()

  useEffect(() => {
    const root = document.documentElement
    const publish = () => {
      if (!router.state.isLoading) root.setAttribute('data-app-hydrated', 'true')
    }
    publish()
    return router.subscribe('onResolved', publish)
  }, [router])

  useEffect(() => {
    const saved = active
    setLocaleRaw(saved)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = localeDir(locale)
  }, [locale])

  // Studio and console live preview: they post the generated theme.css and we swap it in without persisting.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (data?.source !== 'cloud-console' || data.type !== 'set-theme-css') return
      let style = document.getElementById('theme-preview')
      if (!style) {
        style = document.createElement('style')
        style.id = 'theme-preview'
        document.head.appendChild(style)
      }
      style.textContent = typeof data.css === 'string' ? data.css : ''
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const setLocale = (next: string) => {
    setLocaleRaw(next)
    setActiveLocale(next as (typeof supportedLocales)[number])
  }

  return (
    <html lang={active} dir={dir} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: schemeScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
        <script dangerouslySetInnerHTML={{ __html: paletteScript }} />
      </head>
      <body>
        <DirectionProvider dir={dir}>
        <PreferencesContext.Provider value={{ locale, themeId: 'default', setLocale, setThemeId: () => {} }}>
          <QueryClientProvider client={queryClient}>
            <ProjectRpcCtx.Provider value={projectInvoke}>
            <ChatTransportCtx.Provider value={chatTransport}>
            <PikkuProvider pikku={pikku}>
              <SessionGate>{children}</SessionGate>
            </PikkuProvider>
            </ChatTransportCtx.Provider>
            </ProjectRpcCtx.Provider>
          </QueryClientProvider>
        </PreferencesContext.Provider>
        </DirectionProvider>
        <Scripts />
      </body>
    </html>
  )
}
