import { createFileRoute, redirect } from '@tanstack/react-router'
import { lastPage } from '@/lib/last-page'
import { signInPath } from '@pikkustudio/blocks/lib/sign-in-redirect'

export const Route = createFileRoute('/')({
  ssr: false,
  beforeLoad: async () => {
    const last = typeof window === 'undefined' ? undefined : lastPage()
    if (last) throw redirect({ href: last, reloadDocument: true })
    throw redirect({ to: signInPath() })
  },
})
