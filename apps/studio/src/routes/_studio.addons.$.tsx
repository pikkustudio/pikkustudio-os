import { createFileRoute, notFound } from '@tanstack/react-router'
import { AddonHost } from '@/addon-ui/AddonHost'
import { installedAddons } from '@/addon-ui/registry'
import { resolveAddonScreen } from '@/addon-ui/resolve'

const resolve = (splat: string | undefined) => {
  const resolved = resolveAddonScreen(installedAddons, splat ?? '')
  if (!resolved?.screen.component) throw notFound()
  return resolved
}

export const Route = createFileRoute('/_studio/addons/$')({
  loader: ({ params }) => {
    resolve(params._splat)
  },
  component: function AddonRoute() {
    return <AddonHost resolved={resolve(Route.useParams()._splat)} />
  },
})
