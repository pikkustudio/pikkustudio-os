import { createFileRoute, redirect } from '@tanstack/react-router'
import { lastPage } from '@/lib/last-page'
import { appHref } from '@/lib/env'
import { signInPath } from '@pikkustudio/blocks/lib/sign-in-redirect'

export const Route = createFileRoute('/')({
  ssr: false,
  beforeLoad: async () => {
    const last = typeof window === 'undefined' ? undefined : lastPage()
    if (last) throw redirect({ href: last, reloadDocument: true })
    // The web build's sign-in page (/login) comes from the web addon, so this build's route tree may not have it: an
    // href, not a typed `to`.
    throw redirect({ href: appHref(signInPath()) })
  },
})
