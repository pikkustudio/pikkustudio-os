import { asI18n, sep, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Fragment, useContext, useMemo, useState } from 'react'
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createExpandedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  filterFn_includesString,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type ExpandedState,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Copy, Download, Search } from 'lucide-react'
import { Dot } from '../blocks/RowCard'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { PageHead } from '../blocks/PageHead'
import { Segmented } from '../blocks/Segmented'
import { Page } from '../blocks/Page'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { TargetSwitch } from '../blocks/TargetSwitch'
import { useProjectTarget } from '../lib/project-target'
import { ErrorState } from '../blocks/ErrorState'

type Level = 'error' | 'warn' | 'info'
type Source = 'Server' | 'Website'
type Entry = { id: number; at: number; level: Level; source: Source; fn: I18nString; wire: I18nString; ms: number | null; trace: I18nString; text: I18nString; org: I18nString; user: I18nString }
export type LogRow = { id: number; at: number; level: Level; source: string; wire: string | null; fn: string | null; ms: number | null; trace: string | null; text: string; tenantOrgId?: string | null; tenantUserId?: string | null }
const sample = (): { levels: Array<[string, I18nString]>; ranges: Array<[string, I18nString]> } => ({
  levels: [
    ['all', m.logs_screen__level_all()],
    ['error', m.logs_screen__level_errors()],
    ['warn', m.logs_screen__level_warnings()],
    ['info', m.logs_screen__level_info()],
  ],
  ranges: [
    ['15', m.logs_screen__range_15()],
    ['60', m.logs_screen__range_60()],
    ['1440', m.logs_screen__range_1440()],
  ],
})

/** What a log line says, and which function, wire and trace it belongs to, comes from the running app, not from us. */
const fromRow = (r: LogRow): Entry => {
  const wire = r.wire ?? ''
  const fn = r.fn ?? ''
  const trace = r.trace ?? ''
  const text = r.text
  return { id: r.id, at: r.at, level: r.level, ms: r.ms, source: r.source === 'server' ? 'Server' : 'Website', wire: asI18n(wire), fn: asI18n(fn), trace: asI18n(trace), text: asI18n(text), org: asI18n(r.tenantOrgId ?? ''), user: asI18n(r.tenantUserId ?? '') }
}

const clock = (at: number): I18nString => {
  const time = new Date(at).toISOString().slice(11, 23)
  return asI18n(time)
}
const sourceName = (source: Source): I18nString => (source === 'Server' ? m.logs_screen__source_server() : m.logs_screen__source_website())
const levelTone: Record<Level, string> = { error: 'bg-destructive text-white', warn: 'bg-warning text-warning-foreground', info: 'bg-secondary text-ink-2' }
const name = (level: Level): I18nString => ({ error: m.logs_screen__name_error(), warn: m.logs_screen__name_warn(), info: m.logs_screen__name_info() })[level]
/** Column titles, as functions so they follow the language. */
const labels: Record<string, () => I18nString> = {
  at: () => m.logs_screen__when(),
  level: () => m.logs_screen__level(),
  source: () => m.logs_screen__source(),
  wire: () => m.logs_screen__type(),
  fn: () => m.logs_screen__function(),
  text: () => m.logs_screen__message(),
  ms: () => m.logs_screen__duration(),
  trace: () => m.logs_screen__trace_id(),
  org: () => m.logs_screen__tenant_org(),
  user: () => m.logs_screen__tenant_user(),
}
const pageSize = 25
const severity: Record<Level, number> = { error: 0, warn: 1, info: 2 }

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowExpandingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  filterFns: { equalsString: filterFn_equalsString, includesString: filterFn_includesString },
  sortFns: { basic: sortFn_basic },
})
const col = createColumnHelper<typeof features, Entry>()
const columns = col.columns([
  col.display({
    id: 'open',
    header: '',
    enableHiding: false,
    cell: ({ row }) => (
      <button type="button" aria-expanded={row.getIsExpanded()} aria-label={row.getIsExpanded() ? m.logs_screen__hide_line() : m.logs_screen__show_line()} className="grid size-5 place-items-center rounded text-muted-foreground">
        <ChevronRight className={`size-4 transition-transform ${row.getIsExpanded() ? 'rotate-90' : 'rtl:-scale-x-100'}`} />
      </button>
    ),
  }),
  col.accessor('at', { header: () => labels.at(), cell: (c) => <span dir="ltr" className="font-mono text-[13px] whitespace-nowrap text-ink-2 tabular-nums">{clock(c.getValue())}</span> }),
  col.accessor('level', {
    header: () => labels.level(),
    filterFn: 'equalsString',
    sortFn: (a, b) => severity[a.original.level] - severity[b.original.level],
    cell: (c) => <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${levelTone[c.getValue()]}`}>{name(c.getValue())}</span>,
  }),
  col.accessor('source', { header: () => labels.source(), filterFn: 'equalsString', cell: (c) => <span className="text-[14px] text-ink-2">{sourceName(c.getValue())}</span> }),
  col.accessor('wire', { header: () => labels.wire(), filterFn: 'equalsString', cell: (c) => <span dir="ltr" className="rounded-md border border-border px-2 py-0.5 font-mono text-[12px] text-ink-2">{c.getValue()}</span> }),
  col.accessor('fn', { header: () => labels.fn(), filterFn: 'equalsString', cell: (c) => <span dir="ltr" className="block truncate font-mono text-[13px] text-ink-2">{c.getValue()}</span> }),
  col.accessor('text', { header: () => labels.text(), enableSorting: false, cell: (c) => <span dir="ltr" className="block truncate font-mono text-[13px]">{c.getValue()}</span> }),
  col.accessor('ms', { header: () => labels.ms(), enableSorting: true, cell: (c) => <span dir="ltr" className="block text-end font-mono text-[13px] text-ink-2 tabular-nums">{c.getValue() === null ? sep('—') : m.logs_screen__ms({ ms: c.getValue() ?? '' })}</span> }),
  col.accessor('trace', {
    header: () => labels.trace(),
    filterFn: 'equalsString',
    enableSorting: false,
    cell: (c) => <span dir="ltr" className="font-mono text-[13px] text-ink-2">{c.getValue()}</span>,
  }),
  col.accessor('org', { header: () => labels.org(), filterFn: 'equalsString', enableSorting: false, cell: (c) => <span dir="ltr" className="block truncate font-mono text-px13 text-ink-2">{c.getValue()}</span> }),
  col.accessor('user', { header: () => labels.user(), filterFn: 'equalsString', enableSorting: false, cell: (c) => <span dir="ltr" className="block truncate font-mono text-px13 text-ink-2">{c.getValue()}</span> }),
])
const widths: Record<string, string> = { open: 'w-9', at: 'w-32', level: 'w-26', source: 'w-24', wire: 'w-28', fn: 'w-36', ms: 'w-24', trace: 'w-28', org: 'w-28', user: 'w-28' }
const empty: LogRow[] = []
const noEntries: Entry[] = []

export type LogsFeed = { rows: LogRow[]; isPending: boolean; error: unknown; isFetching: boolean; updatedAt: number; retry: () => void }

type LogLine = { timestamp: string; level: Level; source?: string; functionName: string; message: string; traceId?: string; tenantOrgId?: string | null; tenantUserId?: string | null; wire: string | null; ms: number | null }

const rowsOf = (lines: LogLine[]): LogRow[] =>
  lines.map((l, i) => ({ id: lines.length - i, at: Date.parse(l.timestamp), level: l.level, source: l.source ?? 'server', wire: l.wire, fn: l.functionName || null, ms: l.ms, trace: l.traceId ?? null, text: l.message, tenantOrgId: l.tenantOrgId ?? null, tenantUserId: l.tenantUserId ?? null }))

/** What the open copy printed: this computer, a cloud sandbox or a published stage, read through the same function. */
export function LogsScreen() {
  const [live, setLive] = useState(false)
  const key = useProjectKey()
  const project = useProjectTarget()
  const target = { kind: project.kind, name: project.name }
  const logs = usePikkuQuery('studio:projectLogEntries', { key, target, limit: 1000 }, { enabled: !!key, refetchInterval: live ? 2000 : false })
  const lines = (logs.data as { logs: LogLine[] } | undefined)?.logs
  const rows = useMemo(() => (lines ? rowsOf(lines) : empty), [lines])
  const feed: LogsFeed = {
    rows,
    isPending: !!key && logs.isPending,
    error: logs.error,
    isFetching: logs.isFetching,
    updatedAt: logs.dataUpdatedAt,
    retry: () => void logs.refetch(),
  }
  return (
    <LogsView
      feed={feed}
      live={live}
      onLive={setLive}
      head={
        <PageHead crumb={m.logs_screen__crumb()} title={m.logs_screen__title()} text={m.logs_screen__text()} size="lead">
          <TargetSwitch />
        </PageHead>
      }
    />
  )
}

export function LogsView({ feed, live, onLive, head }: { feed: LogsFeed; live: boolean; onLive: (on: boolean) => void; head: I18nNode }) {
  const { say } = useContext(ShellCtx)
  const [range, setRange] = useState('1440')
  const rows = useMemo(() => (feed.rows.length ? feed.rows.map(fromRow) : noEntries), [feed.rows])
  const now = feed.updatedAt || Date.now()
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'at', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [visibility, setVisibility] = useState<ColumnVisibilityState>({ source: false, org: false, user: false })
  const [picking, setPicking] = useState(false)
  const inRange = useMemo(() => (rows.length ? rows.filter((r) => now - r.at <= Number(range) * 60_000) : noEntries), [rows, range, now])
  const table = useTable({
    features,
    columns,
    data: inRange,
    getRowId: (r) => String(r.id),
    getRowCanExpand: () => true,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (c) => c.id === 'text' || c.id === 'fn' || c.id === 'trace' || c.id === 'wire',
    state: { globalFilter, columnFilters, sorting, pagination, expanded, columnVisibility: visibility },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setVisibility,
  })

  const filter = (id: string) => (columnFilters.find((f) => f.id === id)?.value as string | undefined) ?? 'all'
  const setFilter = (id: string, value: string) => setColumnFilters((all) => [...all.filter((f) => f.id !== id), ...(value === 'all' ? [] : [{ id, value }])])
  const count = (l: Level) => inRange.filter((r) => r.level === l).length
  const found = table.getFilteredRowModel().rows
  const pageRows = table.getRowModel().rows
  const line = (r: Entry) => `${clock(r.at)} ${name(r.level).toUpperCase()} ${r.source} ${r.wire} ${r.fn} ${r.ms ?? '-'}ms ${r.trace} ${r.text}`
  const copy = (value: string) => void navigator.clipboard?.writeText(value).catch(() => undefined)
  const clear = globalFilter || columnFilters.length > 0
  const from = pagination.pageIndex * pagination.pageSize
  const functions = useMemo(() => [...new Set(inRange.map((r) => String(r.fn)).filter(Boolean))].sort(), [inRange])
  const show = (entry: Entry) => {
    setGlobalFilter('')
    setColumnFilters([{ id: 'level', value: entry.level }, ...(entry.fn ? [{ id: 'fn', value: String(entry.fn) }] : [])])
    setSorting([{ id: 'at', desc: true }])
    const index = inRange.filter((r) => r.level === entry.level && r.fn === entry.fn).sort((a, b) => b.at - a.at).findIndex((r) => r.id === entry.id)
    setPagination({ pageIndex: Math.max(0, Math.floor(index / pageSize)), pageSize })
    setExpanded({ [String(entry.id)]: true })
  }

  return (
    <Page gap="snug">
      {head}
      {feed.isPending ? null : <LogProblems entries={inRange} filtered={!!clear} onShow={show} />}

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1 basis-72">
          <Search className="pointer-events-none absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder={m.logs_screen__search()} aria-label={m.logs_screen__search()} className="h-11.5 rounded-full ps-11" />
        </label>
        <Segmented label={m.logs_screen__level()} value={filter('level')} options={sample().levels.map(([id, t]): [string, I18nString] => [id, id === 'all' ? t : m.logs_screen__level_count({ level: t, count: count(id as Level) })])} onChange={(v) => setFilter('level', v)} />
        <Segmented
          label={m.logs_screen__source()}
          value={filter('source')}
          options={[
            ['all', m.logs_screen__source_all()],
            ['Server', m.logs_screen__source_server()],
            ['Website', m.logs_screen__source_website()],
          ]}
          onChange={(v) => setFilter('source', v)}
        />
        <Segmented label={m.logs_screen__time_range()} value={range} options={sample().ranges} onChange={setRange} />
        {functions.length > 1 ? (
          <Select value={filter('fn')} onValueChange={(v) => setFilter('fn', v)}>
            <SelectTrigger shape="pill" aria-label={m.logs_screen__function()} className="max-w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{m.logs_screen__level_all()}</SelectItem>
              {functions.map((fn) => (
                <SelectItem key={fn} value={fn}>{asI18n(fn)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {feed.error ? <ErrorState error={feed.error} onRetry={feed.retry} retrying={feed.isFetching} /> : null}

      <div className="flex flex-wrap items-center gap-4 text-[14px] text-ink-2">
        <label className="flex items-center gap-2.5 font-semibold text-foreground">
          <Switch checked={live} onCheckedChange={onLive} aria-label={m.logs_screen__live_switch()} />
          {m.project_card__live()}
          {live ? <i className="size-2 animate-pulse rounded-full bg-hero" data-hue="teal" aria-hidden="true" /> : null}
        </label>
        {filter('trace') !== 'all' ? (
          <Button variant="selected" size="compact" onClick={() => setFilter('trace', 'all')}>
            {m.logs_screen__trace_chip({ id: filter('trace') })}
          </Button>
        ) : null}
        <span>{found.length === 0 ? m.logs_screen__no_lines() : m.logs_screen__lines_range({ from: from + 1, to: from + pageRows.length, total: found.length })}</span>
        {clear ? (
          <Button
            variant="bordered"
            size="compact"
            onClick={() => {
              setGlobalFilter('')
              setColumnFilters([])
            }}
          >
            {m.logs_screen__clear_filters()}
          </Button>
        ) : null}
        <span className="ms-auto flex gap-2">
          <span className="relative" onKeyDown={(e) => e.key === 'Escape' && setPicking(false)}>
            <Button variant="bordered" size="compact" aria-expanded={picking} aria-haspopup="true" onClick={() => setPicking((v) => !v)}>
              <Columns3 />{m.logs_screen__columns()}
            </Button>
            {picking ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPicking(false)} aria-hidden="true" />
                <div role="group" aria-label={m.logs_screen__show_columns()} className="absolute end-0 z-20 mt-2 flex w-56 flex-col gap-0.5 rounded-[18px] border border-border bg-popover p-2 text-popover-foreground shadow-lg">
                  {table.getAllLeafColumns().filter((c) => c.getCanHide()).map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[15px] hover:bg-accent">
                      <input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()} className="size-4 accent-primary" />
                      {labels[c.id]?.()}
                    </label>
                  ))}
                  <Button variant="bordered" size="compact" className="mt-1" onClick={() => setVisibility({})}>
                    {m.logs_screen__show_all()}
                  </Button>
                </div>
              </>
            ) : null}
          </span>
          <Button variant="bordered" size="compact" onClick={() => copy(found.map((r) => line(r.original)).join('\n'))}>
            <Copy />{m.logs_screen__copy()}
          </Button>
          <Button variant="bordered" size="compact" onClick={() => say(m.logs_screen__download_say())}>
            <Download />{m.content_file__download()}
          </Button>
        </span>
      </div>

      <div className="overflow-x-auto rounded-[22px] border border-border bg-card">
        <table className="w-full min-w-240 table-fixed border-collapse text-start">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-border text-[13px] text-muted-foreground uppercase">
                {group.headers.map((h) => {
                  const dir = h.column.getIsSorted()
                  return (
                    <th key={h.id} scope="col" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined} className={`${widths[h.column.id] ?? ''} px-3 py-3 font-semibold first:ps-4`}>
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                          <table.FlexRender header={h} />
                          {dir === 'asc' ? <ArrowUp className="size-3.5" /> : dir === 'desc' ? <ArrowDown className="size-3.5" /> : null}
                        </button>
                      ) : (
                        <table.FlexRender header={h} />
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <Fragment key={row.id}>
                <tr className={`cursor-pointer border-b border-border align-top last:border-0 hover:bg-secondary/60 ${row.getIsExpanded() ? 'bg-secondary/60' : ''}`} onClick={row.getToggleExpandedHandler()}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 first:ps-4">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() ? (
                  <tr className="border-b border-border bg-secondary/40 last:border-0">
                    <td />
                    <td colSpan={table.getVisibleLeafColumns().length - 1} className="px-3 py-4">
                      <code dir="ltr" className="block font-mono text-[13px] leading-[1.6] break-words whitespace-pre-wrap">{row.original.text}</code>
                      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-[13px] text-ink-2">
                        <div className="flex gap-1.5"><dt>{m.logs_screen__when()}</dt><dd className="font-semibold text-foreground">{m.logs_screen__when_value({ time: clock(row.original.at) })}</dd></div>
                        <div className="flex gap-1.5"><dt>{m.logs_screen__source()}</dt><dd className="font-semibold text-foreground">{sourceName(row.original.source)}</dd></div>
                        <div className="flex gap-1.5"><dt>{m.logs_screen__type()}</dt><dd dir="ltr" className="font-mono font-semibold text-foreground">{row.original.wire}</dd></div>
                        <div className="flex gap-1.5"><dt>{m.logs_screen__duration()}</dt><dd className="font-semibold text-foreground">{m.logs_screen__ms({ ms: row.original.ms ?? '' })}</dd></div>
                        <div className="flex gap-1.5"><dt>{m.logs_screen__function()}</dt><dd dir="ltr" className="font-mono font-semibold text-foreground">{row.original.fn}</dd></div>
                        <div className="flex gap-1.5"><dt>{m.logs_screen__trace_id()}</dt><dd dir="ltr" className="font-mono font-semibold text-foreground">{row.original.trace}</dd></div>
                        <div className="flex gap-1.5"><dt>{m.logs_screen__line()}</dt><dd className="font-semibold text-foreground">{m.logs_screen__line_number({ id: row.original.id })}</dd></div>
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.original.level !== 'info' ? (
                          <Button variant="default" size="compact" onClick={() => say(m.logs_screen__fix_say({ text: row.original.text }))}>
                            {m.logs_screen__ask_pikku_fix()}
                          </Button>
                        ) : null}
                        <Button variant="bordered" size="compact" onClick={() => setFilter('trace', row.original.trace)}>
                          <Search />{m.logs_screen__whole_trace()}
                        </Button>
                        <Button variant="bordered" size="compact" onClick={() => copy(row.original.trace)}>
                          <Copy />{m.logs_screen__copy_trace_id()}
                        </Button>
                        <Button variant="bordered" size="compact" onClick={() => copy(line(row.original))}>
                          <Copy />{m.logs_screen__copy_line()}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
        {found.length === 0 ? (
          <p className="px-5 py-10 text-center text-[15px] text-muted-foreground">{inRange.length === 0 ? m.logs_screen__empty_none_yet() : m.logs_screen__empty_no_match()}</p>
        ) : null}
      </div>

      {table.getPageCount() > 1 ? (
        <div className="flex items-center justify-center gap-3 text-[14px] text-ink-2">
          <Button variant="bordered" size="compact" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            <ChevronLeft className="rtl:-scale-x-100" />{m.logs_screen__previous()}
          </Button>
          <span>
            {m.logs_screen__page_of({ page: pagination.pageIndex + 1, pages: table.getPageCount() })}
          </span>
          <Button variant="bordered" size="compact" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            {m.logs_screen__next()}<ChevronRight className="rtl:-scale-x-100" />
          </Button>
        </div>
      ) : null}
    </Page>
  )
}

type Problem = { latest: Entry; count: number }

const groupOf = (entries: readonly Entry[], level: Level): Problem[] => {
  const groups = new Map<string, Problem>()
  for (const e of entries) {
    if (e.level !== level) continue
    const key = `${e.fn}\u0000${e.text}`
    const g = groups.get(key)
    if (g) g.count += 1
    else groups.set(key, { latest: e, count: 1 })
  }
  return [...groups.values()].sort((a, b) => b.count - a.count)
}

function LogProblems({ entries, filtered, onShow }: { entries: readonly Entry[]; filtered: boolean; onShow: (entry: Entry) => void }) {
  const { say } = useContext(ShellCtx)
  const errors = useMemo(() => groupOf(entries, 'error'), [entries])
  const warnings = useMemo(() => groupOf(entries, 'warn'), [entries])
  if (entries.length === 0) return null
  const errorCount = errors.reduce((n, g) => n + g.count, 0)
  const warnCount = warnings.reduce((n, g) => n + g.count, 0)
  const busiest = [...entries.reduce((map, e) => map.set(String(e.fn), (map.get(String(e.fn)) ?? 0) + 1), new Map<string, number>())].filter(([fn]) => fn).sort((a, b) => b[1] - a[1])[0]?.[0]
  const tone = errorCount ? 'bad' : warnCount ? 'warn' : 'ok'
  const title = errorCount ? m.logs_screen__problems_title({ count: errorCount }) : warnCount ? m.logs_screen__warnings_title({ count: warnCount }) : m.logs_screen__quiet_title()
  const text = errorCount ? m.logs_screen__problems_text() : warnCount ? m.logs_screen__warnings_text() : m.logs_screen__quiet_text({ lines: entries.length })
  const top = [...errors.slice(0, 6), ...warnings.slice(0, 3)]
  return (
    <section aria-label={m.logs_screen__problems_label()} className={`flex flex-col gap-3 rounded-card border bg-card px-5 py-4 shadow-card ${tone === 'bad' ? 'border-destructive/40' : tone === 'warn' ? 'border-warning' : 'border-border'}`}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Dot tone={tone}>{title}</Dot>
        <span className="text-[14px] text-ink-2">{text}</span>
        {busiest ? <span className="ms-auto text-[13px] text-muted-foreground">{m.logs_screen__busiest({ name: asI18n(busiest) })}</span> : null}
      </div>
      {filtered ? <p className="text-[13px] text-muted-foreground">{m.logs_screen__problems_filtered()}</p> : null}
      {top.length ? (
        <ul className="flex flex-col gap-2">
          {top.map(({ latest, count }) => (
            <li key={latest.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/60 px-3.5 py-2.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${levelTone[latest.level]}`}>{name(latest.level)}</span>
              <span className="min-w-0 flex-1 basis-60">
                <code dir="ltr" className="block truncate font-mono text-[13px]">{latest.text}</code>
                <small className="block text-[13px] text-ink-2">{latest.fn ? m.logs_screen__problem_where({ count, name: latest.fn }) : m.logs_screen__problem_times({ count })}</small>
              </span>
              <Button variant="bordered" size="compact" onClick={() => onShow(latest)}>
                {m.logs_screen__problem_show()}
              </Button>
              {latest.level === 'error' ? (
                <Button variant="default" size="compact" onClick={() => say(m.logs_screen__fix_say({ text: latest.text }))}>
                  {m.logs_screen__ask_pikku_fix()}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
