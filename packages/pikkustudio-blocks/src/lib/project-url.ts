import type { LocationRewrite } from '@tanstack/react-router'

// Every studio URL is scoped by its team: /<team>/projects, /<team>/<project>/<page>. The open edition
// has one team, `local`. Inside the app the team and the project ride in the `team` and `project`
// search params, so routes stay /projects and /overview.

// Not scoped by a team: onboarding, your own account, and the signed-in template app at /app.
const GLOBAL = new Set(['claim-stripe', 'sign-in', 'your-name', 'choose-ai', 'new-team', 'accept-invite', 'account', 'app', 'login', 'signup'])
// The team's own pages: no project in their URL.
const TEAM_PAGES = new Set(['projects', 'secrets', 'studio-metrics', 'new-project'])
const PAGES = new Set(['overview', 'resume', 'changes-directions', 'build', 'design', 'emails', 'translations', 'artifacts', 'knowledge', 'content', 'front-doors', 'code', 'audit', 'apps', 'publish', 'explore', 'logs', 'performance', 'metrics', 'assistants', 'virtual-users', 'routines', 'versions', 'lab', 'addons', 'add-ons', 'billing', 'team', 'settings', 'plans', 'ai', 'domains', 'mocks'])

const unquote = (v: string) => v.replace(/^"(.*)"$/, '$1')
// A project param from before teams were in the URL was `owner/slug`.
const bareSlug = (v: string) => unquote(v).split('/').pop()!

export const isTeamScoped = (pathname: string) => {
  const first = pathname.split('/').filter(Boolean)[0]
  return !!first && !GLOBAL.has(first)
}

export const projectRewrite: LocationRewrite = {
  input: ({ url }) => {
    const [first, second, ...more] = url.pathname.split('/').filter(Boolean)
    // Unscoped paths pass through; the team guard adds the team.
    if (!first || GLOBAL.has(first) || TEAM_PAGES.has(first) || PAGES.has(first)) return url
    url.searchParams.set('team', JSON.stringify(first))
    if (second === undefined) {
      url.pathname = '/projects'
    } else if (TEAM_PAGES.has(second) || PAGES.has(second)) {
      url.pathname = `/${[second, ...more].join('/')}`
    } else {
      url.searchParams.set('project', JSON.stringify(second))
      url.pathname = `/${more.length ? more.join('/') : 'overview'}`
    }
    return url
  },
  output: ({ url }) => {
    const team = url.searchParams.get('team')
    const project = url.searchParams.get('project')
    if (team === null && project === null) return url
    url.searchParams.delete('team')
    url.searchParams.delete('project')
    const first = url.pathname.split('/').filter(Boolean)[0]
    if (!first || GLOBAL.has(first)) return url
    if (team === null) {
      // No team known yet: keep the project in the URL so it survives until the guard scopes it.
      if (project !== null && !TEAM_PAGES.has(first)) url.pathname = `/${unquote(project)}${url.pathname}`
      return url
    }
    const scope = `/${unquote(team)}`
    url.pathname = project !== null && !TEAM_PAGES.has(first) ? `${scope}/${bareSlug(project)}${url.pathname}` : `${scope}${url.pathname}`
    return url
  },
}
