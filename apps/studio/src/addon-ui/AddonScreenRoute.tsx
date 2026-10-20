import { notFound, useParams } from '@tanstack/react-router'
import { AddonHost } from './AddonHost'
import { AddonIframe } from './AddonIframe'
import { installedAddons } from './registry'
import { hasScopes, useViewerScopes } from '@pikkustudio/blocks/lib/scopes'
import { StudioLoading } from '@pikkustudio/blocks/blocks/StudioLoading'
import { NotFoundPage } from '@pikkustudio/blocks/blocks/NotFoundPage'

// What a generated route (scripts/gen-addons.mjs) renders: one addon screen, at its real path.
export function AddonScreenRoute({ addon, path }: { addon: string; path: string }) {
  const all = useParams({ strict: false }) as Record<string, string | undefined>
  const found = installedAddons.find((candidate) => candidate.name === addon)
  const screen = found?.screens.find((candidate) => candidate.path === path)
  const held = useViewerScopes()
  if (!found || !screen) throw notFound()
  // A screen that asks for scopes waits for the viewer's, and is not there for a viewer without them.
  if (screen.scopes?.length && !held) return <StudioLoading />
  if (!hasScopes(screen.scopes, held)) return <NotFoundPage />
  const params: Record<string, string> = {}
  for (const part of path.split('/')) if (part.startsWith(':')) params[part.slice(1)] = all[part.slice(1)] ?? ''
  if (screen.component) return <AddonHost resolved={{ addon: found, screen, params }} />
  return <AddonIframe addon={addon} path={path.replace(/:(\w+)/g, (_, name: string) => encodeURIComponent(params[name] ?? ''))} />
}
