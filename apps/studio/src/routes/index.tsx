import { createFileRoute, redirect } from '@tanstack/react-router'
import { lastPage } from '@/lib/last-page'

export const Route = createFileRoute('/')({
  ssr: false,
  beforeLoad: async () => {
    const last = typeof window === 'undefined' ? undefined : lastPage()
    if (last) throw redirect({ href: last, reloadDocument: true })
    throw redirect({ to: '/sign-in' })
  },
})
