const LOOPBACK = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/

export const isLoopbackUrl = (url: string) => {
  try {
    return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)
  } catch {
    return true
  }
}

/**
 * A workspace names its apps and design preview by the address they have inside it (127.0.0.1:<port>), which a browser
 * cannot open. Its public origin serves the same pages: the first app at `/`, the others and the design preview under
 * `/_frontend/<slug>/`. Keep in step with `reachable` in ui-blocks' workspace-route.ts.
 */
export const reachableApps = <T extends { slug: string; url: string | null }>(apps: T[], origin: string | null | undefined): T[] =>
  apps.map((app, i) => {
    if (!app.url || !isLoopbackUrl(app.url)) return app
    if (!origin || !LOOPBACK.test(app.url)) return { ...app, url: null }
    return { ...app, url: i === 0 ? `${origin}/` : `${origin}/_frontend/${app.slug}/` }
  })

export const reachableDesign = <T extends { url: string }>(design: T | null, origin: string | null | undefined): T | null => {
  if (!design || !LOOPBACK.test(design.url)) return design
  return origin ? { ...design, url: `${origin}/_frontend/design/` } : design
}
