import type { LocationRewrite } from '@tanstack/react-router'

// Every studio URL is scoped by its team: /<team>/projects, /<team>/<project>/<page>. The open edition
// has one team, `local`. Inside the app the team and the project ride in the `team` and `project`
// search params, so routes stay /projects and /home.

// Not scoped by a team: onboarding, your own account, and the signed-in template app at /app.
const GLOBAL = new Set(['claim-stripe', 'sign-in', 'your-name', 'choose-ai', 'new-team', 'profile', 'accept-invite', 'account', 'app', 'login', 'signup', 'admin', 'cli-auth', 'oauth', 'connect'])
// The team's own pages: no project in their URL.
const TEAM_PAGES = new Set(['projects', 'secrets', 'studio-metrics', 'new-project'])
// Project pages. The value says whether the page reads the project's running app: those show the start screen until it is up.
// Publish and Resume never call it; the rest are team pages.
export const PAGES: Record<string, boolean> = {
  home: true, project: false, review: false, 'review-ui': false, 'review-fixes': false, resume: false, publish: false, build: false, lab: false,
  billing: false, team: false, settings: false, 'project-settings': false, plans: false, ai: false, domains: false, workspaces: false, 'secret-access': false, 'project-secrets': true,
  'changes': true, design: true, emails: true, inbox: false, translations: true, artifacts: true, knowledge: true, content: true,
  'front-doors': true, code: true, audit: true, apps: true, explore: true, logs: true, performance: true, metrics: true, scorers: true, checks: true, connections: true, 'incoming-alerts': true,
  assistants: true, 'virtual-users': true, accounts: true, workflows: true, 'scheduled-tasks': true, 'queues': true, database: true, 'sign-in-options': true, 'outgoing-messages': true, screens: true, functions: true, 'live-connections': true, versions: false, addons: true, 'add-ons': true, mocks: true, surface: true, switches: true, permissions: true, security: true,
}
const isPage = (name: string) => Object.hasOwn(PAGES, name)

export const pageNeedsApp = (pathname: string) => {
  const first = pathname.split('/').filter(Boolean)[0]
  return !!first && !GLOBAL.has(first) && !TEAM_PAGES.has(first) && PAGES[first] !== false
}

const unquote = (v: string) => v.replace(/^"(.*)"$/, '$1')
// A project param from before teams were in the URL was `owner/slug`.
const bareSlug = (v: string) => unquote(v).split('/').pop()!

export const isTeamScoped = (pathname: string) => {
  const first = pathname.split('/').filter(Boolean)[0]
  return !!first && !GLOBAL.has(first)
}

export const keepSearch = (prev: object) => prev

// Entity ids used to ride in the query (?email=, ?file=). Old links still open: they are rewritten to the path form.
const LEGACY: Record<string, string> = { changes: 'change', emails: 'email', inbox: 'message', knowledge: 'note', code: 'file' }
const SPLAT = new Set(['knowledge', 'code'])
export const encodePath = (v: string) => v.split('/').map(encodeURIComponent).join('/')

const legacyToPath = (url: URL) => {
  const segs = url.pathname.split('/').filter(Boolean)
  if (segs.length !== 1) return url
  const page = segs[0]!
  if (page === 'design') {
    const lens = url.searchParams.get('parts')
    if (lens !== 'library' && lens !== 'app') return url
    const part = url.searchParams.get('part')
    url.searchParams.delete('parts')
    url.searchParams.delete('part')
    url.pathname = `/design/parts/${lens}${part ? `/${encodeURIComponent(part)}` : ''}`
    return url
  }
  const key = LEGACY[page]
  const id = key ? url.searchParams.get(key) : null
  if (!key || !id) return url
  url.searchParams.delete(key)
  url.pathname = `/${page}/${SPLAT.has(page) ? encodePath(id) : encodeURIComponent(id)}`
  return url
}

export const projectRewrite: LocationRewrite = {
  input: ({ url }) => legacyToPath(scopeInput(url)),
  output: ({ url }) => scopeOutput(url),
}

const scopeInput = (url: URL) => {
  url.pathname = url.pathname.replace(/\/changes-directions(?=\/|$)/, '/changes')
  const [first, second, ...more] = url.pathname.split('/').filter(Boolean)
  // Unscoped paths pass through; the team guard adds the team.
  if (!first || GLOBAL.has(first) || TEAM_PAGES.has(first) || isPage(first)) return url
  url.searchParams.set('team', JSON.stringify(first))
  if (second === undefined) {
    url.pathname = '/projects'
  } else if (TEAM_PAGES.has(second) || isPage(second)) {
    url.pathname = `/${[second, ...more].join('/')}`
  } else {
    url.searchParams.set('project', JSON.stringify(second))
    const [kind, name, ...page] = more
    const rest = (kind === 'workspace' || kind === 'stage') && name ? page : more
    if (rest !== more) url.searchParams.set('target', JSON.stringify(`${kind}/${name}`))
    url.pathname = `/${rest.length ? rest.join('/') : 'home'}`
  }
  return url
}

const scopeOutput = (url: URL) => {
  const team = url.searchParams.get('team')
  const project = url.searchParams.get('project')
  const target = url.searchParams.get('target')
  url.searchParams.delete('target')
  if (team === null && project === null) return url
  url.searchParams.delete('team')
  url.searchParams.delete('project')
  const at = target ? `/${unquote(target)}` : ''
  const first = url.pathname.split('/').filter(Boolean)[0]
  if (!first || GLOBAL.has(first)) return url
  if (team === null) {
    // No team known yet: keep the project in the URL so it survives until the guard scopes it.
    if (project !== null && !TEAM_PAGES.has(first)) url.pathname = `/${unquote(project)}${at}${url.pathname}`
    return url
  }
  const scope = `/${unquote(team)}`
  url.pathname = project !== null && !TEAM_PAGES.has(first) ? `${scope}/${bareSlug(project)}${at}${url.pathname}` : url.pathname === '/projects' ? scope : `${scope}${url.pathname}`
  return url
}
