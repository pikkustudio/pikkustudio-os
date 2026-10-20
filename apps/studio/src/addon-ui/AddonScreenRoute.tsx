import { notFound, useParams } from '@tanstack/react-router'
import { AddonHost } from './AddonHost'
import { AddonIframe } from './AddonIframe'
import { installedAddons } from './registry'

// What a generated route (scripts/gen-addons.mjs) renders: one addon screen, at its real path.
export function AddonScreenRoute({ addon, path }: { addon: string; path: string }) {
  const all = useParams({ strict: false }) as Record<string, string | undefined>
  const found = installedAddons.find((candidate) => candidate.name === addon)
  const screen = found?.screens.find((candidate) => candidate.path === path)
  if (!found || !screen) throw notFound()
  const params: Record<string, string> = {}
  for (const part of path.split('/')) if (part.startsWith(':')) params[part.slice(1)] = all[part.slice(1)] ?? ''
  if (screen.component) return <AddonHost resolved={{ addon: found, screen, params }} />
  return <AddonIframe addon={addon} path={path.replace(/:(\w+)/g, (_, name: string) => encodeURIComponent(params[name] ?? ''))} />
}
