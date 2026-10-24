import { createFileRoute, redirect } from '@tanstack/react-router'
import { lastPage } from '@/lib/last-page'
import { hasSession } from '@/lib/studio-gate'
import { appHref, STUDIO_LOCAL } from '@/lib/env'
import { signInPath } from '@pikkustudio/blocks/lib/sign-in-redirect'

export const Route = createFileRoute('/')({
  ssr: false,
  beforeLoad: async () => {
    const last = typeof window === 'undefined' ? undefined : lastPage()
    if (last) throw redirect({ href: last, reloadDocument: true })
    if (!STUDIO_LOCAL && typeof window !== 'undefined' && (await hasSession().catch(() => false))) throw redirect({ href: '/projects', replace: true })
    // The web build's sign-in page (/login) comes from the web addon, so this build's route tree may not have it: an
    // href, not a typed `to`.
    throw redirect({ href: appHref(signInPath()) })
  },
})
