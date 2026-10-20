import { createFileRoute, redirect } from '@tanstack/react-router'

// An addon's screens used to live at /addons/<addon>/<path>; they are at their own path now. Old links still open.
export const Route = createFileRoute('/_studio/addons/$')({
  beforeLoad: ({ params, search }) => {
    const [, ...rest] = (params._splat ?? '').split('/').filter(Boolean)
    throw redirect({ to: `/${rest.join('/')}` as never, search: search as never, replace: true })
  },
})
