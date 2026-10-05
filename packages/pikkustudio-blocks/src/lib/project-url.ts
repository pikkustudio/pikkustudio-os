import type { LocationRewrite } from '@tanstack/react-router'

const OUTSIDE = new Set(['projects', 'secrets', 'new-project', 'new-team', 'accept-invite', 'sign-in', 'your-name', 'choose-ai'])
const PAGES = new Set(['overview', 'prototype', 'build', 'emails', 'translations', 'artifacts', 'knowledge', 'content', 'apps', 'publish', 'explore', 'logs', 'assistants', 'routines', 'versions', 'lab', 'addons', 'add-ons', 'billing', 'team', 'settings', 'plans', 'ai'])

const unquote = (v: string) => v.replace(/^"(.*)"$/, '$1')

export const projectRewrite: LocationRewrite = {
  input: ({ url }) => {
    const [owner, second, ...more] = url.pathname.split('/').filter(Boolean)
    if (!owner || OUTSIDE.has(owner) || PAGES.has(owner)) return url
    if (owner === 'app' && second === 'p') return url
    const owned = second !== undefined && !PAGES.has(second)
    const rest = owned ? more : second === undefined ? [] : [second, ...more]
    url.searchParams.set('project', JSON.stringify(owned ? `${owner}/${second}` : owner))
    url.pathname = `/${rest.length ? rest.join('/') : 'overview'}`
    return url
  },
  output: ({ url }) => {
    const slug = url.searchParams.get('project')
    if (slug === null) return url
    url.searchParams.delete('project')
    const first = url.pathname.split('/').filter(Boolean)[0]
    if (!first || OUTSIDE.has(first)) return url
    url.pathname = `/${unquote(slug)}${url.pathname}`
    return url
  },
}
