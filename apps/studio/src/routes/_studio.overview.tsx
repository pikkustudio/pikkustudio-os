import { createFileRoute, redirect } from '@tanstack/react-router'

// The project's front page lives at /home; /overview is kept so old links land there.
export const Route = createFileRoute('/_studio/overview')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/home', search: search as never, replace: true })
  },
})
