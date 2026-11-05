import { createFileRoute, redirect } from '@tanstack/react-router'

// Domains became Sharing; /domains is kept so old links land there.
export const Route = createFileRoute('/_studio/domains')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/sharing', search: search as never, replace: true })
  },
})
