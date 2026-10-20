import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_studio/workspaces')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/home', search: search as never, replace: true })
  },
})
