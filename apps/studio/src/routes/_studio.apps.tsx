import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_studio/apps')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/front-doors', search: search as never, replace: true })
  },
})
