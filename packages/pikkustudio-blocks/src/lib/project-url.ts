import type { LocationRewrite } from '@tanstack/react-router'

// Every studio URL is scoped by its team: /<team>/projects, /<team>/<project>/<page>. The open edition
// has one team, `local`. Inside the app the team and the project ride in the `team` and `project`
// search params, so routes stay /projects and /overview.

// Not scoped by a team: onboarding, your own account, and the signed-in template app at /app.
const GLOBAL = new Set(['claim-stripe', 'sign-in', 'your-name', 'choose-ai', 'new-team', 'profile', 'accept-invite', 'account', 'app', 'login', 'signup', 'admin', 'cli-auth', 'oauth'])
// The team's own pages: no project in their URL.
const TEAM_PAGES = new Set(['projects', 'secrets', 'studio-metrics', 'new-project'])
// Project pages. The value says whether the page reads the project's running app: those show the start screen until it is up.
// Publish and Resume never call it; the rest are team pages.
export const PAGES: Record<string, boolean> = {
  overview: true, project: false, review: false, 'review-ui': false, 'review-fixes': false, resume: false, publish: false, build: false, lab: false,
  billing: false, team: false, settings: false, 'project-settings': false, plans: false, ai: false, domains: false, workspaces: false, 'secret-access': false,
  'changes': true, design: true, emails: true, translations: true, artifacts: true, knowledge: true, content: true,
  'front-doors': true, code: true, audit: true, apps: true, explore: true, logs: true, performance: true, metrics: true, scorers: true, 'incoming-alerts': true,
  assistants: true, 'virtual-users': true, accounts: true, routines: true, versions: false, addons: true, 'add-ons': true, mocks: true, surface: true, security: true,
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

export const projectRewrite: LocationRewrite = {
  input: ({ url }) => {
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
      url.pathname = `/${rest.length ? rest.join('/') : 'overview'}`
    }
    return url
  },
  output: ({ url }) => {
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
    url.pathname = project !== null && !TEAM_PAGES.has(first) ? `${scope}/${bareSlug(project)}${at}${url.pathname}` : `${scope}${url.pathname}`
    return url
  },
}
