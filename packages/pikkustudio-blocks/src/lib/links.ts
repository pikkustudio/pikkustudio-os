const PAGE_SCOPED = ['file', 'folder', 'item', 'pg', 'part', 'parts', 'stage', 'view', 'show', 'note', 'email', 'pitch', 'redirect', 'fq', 'who', 'reach', 'scope', 'builtin', 'fn', 'kind', 'ch']

export const withoutPageParams = (search: object) => {
  const next: Record<string, unknown> = { ...search }
  for (const key of PAGE_SCOPED) delete next[key]
  return next
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const keep: any = { search: withoutPageParams }
