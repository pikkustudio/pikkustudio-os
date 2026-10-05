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
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { PageHead } from '../blocks/PageHead'
import { Segmented } from '../blocks/Segmented'
import { Page } from '../blocks/Page'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { ShellCtx } from '../lib/shell'

type Level = 'error' | 'warn' | 'info'
type Entry = { id: number; at: number; level: Level; source: string; fn: string; wire: string; ms: number | null; trace: string; text: string }
type Row = { id: number; at: number; level: Level; source: string; wire: string | null; fn: string | null; ms: number | null; trace: string | null; text: string }
const sample = {
  levels: [
    ['all', 'All'],
    ['error', 'Errors'],
    ['warn', 'Warnings'],
    ['info', 'Info'],
  ] as Array<[string, string]>,
  ranges: [
    ['15', '15 min'],
    ['60', '1 hour'],
    ['1440', '24 hours'],
  ] as Array<[string, string]>,
}

const fromRow = (r: Row): Entry => ({ ...r, source: r.source === 'server' ? 'Server' : 'Website', wire: r.wire ?? '', fn: r.fn ?? '', trace: r.trace ?? '' })

const clock = (at: number) => new Date(at).toISOString().slice(11, 23)
const tone: Record<Level, string> = { error: 'bg-destructive text-white', warn: 'bg-warning text-warning-foreground', info: 'bg-secondary text-ink-2' }
const name: Record<Level, string> = { error: 'Error', warn: 'Warning', info: 'Info' }
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
      <button type="button" aria-expanded={row.getIsExpanded()} aria-label={row.getIsExpanded() ? 'Hide this line' : 'Show this line'} className="grid size-5 place-items-center rounded text-muted-foreground">
        <ChevronRight className={`size-4 transition-transform ${row.getIsExpanded() ? 'rotate-90' : ''}`} />
      </button>
    ),
  }),
  col.accessor('at', { header: 'Time', cell: (c) => <span className="font-mono text-[13px] whitespace-nowrap text-ink-2 tabular-nums">{clock(c.getValue())}</span> }),
  col.accessor('level', {
    header: 'Level',
    filterFn: 'equalsString',
    sortFn: (a, b) => severity[a.original.level] - severity[b.original.level],
    cell: (c) => <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${tone[c.getValue()]}`}>{name[c.getValue()]}</span>,
  }),
  col.accessor('source', { header: 'Source', filterFn: 'equalsString', cell: (c) => <span className="text-[14px] text-ink-2">{c.getValue()}</span> }),
  col.accessor('wire', { header: 'Type', filterFn: 'equalsString', cell: (c) => <span className="rounded-md border border-border px-2 py-0.5 font-mono text-[12px] text-ink-2">{c.getValue()}</span> }),
  col.accessor('fn', { header: 'Function', filterFn: 'equalsString', cell: (c) => <span className="block truncate font-mono text-[13px] text-ink-2">{c.getValue()}</span> }),
  col.accessor('text', { header: 'Message', enableSorting: false, cell: (c) => <span className="block truncate font-mono text-[13px]">{c.getValue()}</span> }),
  col.accessor('ms', { header: 'Duration', enableSorting: true, cell: (c) => <span className="block text-right font-mono text-[13px] text-ink-2 tabular-nums">{c.getValue() === null ? '—' : `${c.getValue()} ms`}</span> }),
  col.accessor('trace', {
    header: 'Trace ID',
    filterFn: 'equalsString',
    enableSorting: false,
    cell: (c) => <span className="font-mono text-[13px] text-ink-2">{c.getValue()}</span>,
  }),
])
const widths: Record<string, string> = { open: 'w-9', at: 'w-32', level: 'w-26', source: 'w-24', wire: 'w-28', fn: 'w-36', ms: 'w-24', trace: 'w-28' }
const empty: Entry[] = []

export function LogsScreen() {
  const { say } = useContext(ShellCtx)
  const [range, setRange] = useState('1440')
  const [live, setLive] = useState(false)
  const key = useProjectKey()
  const logs = usePikkuQuery('studio:projectLogEntries', { key, limit: 1000 }, { enabled: !!key, refetchInterval: live ? 2000 : false })
  const rows = useMemo(() => ((logs.data as { entries: Row[] } | undefined)?.entries ?? []).map(fromRow), [logs.data])
  const now = logs.dataUpdatedAt || Date.now()
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'at', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [visibility, setVisibility] = useState<ColumnVisibilityState>({ source: false })
  const [picking, setPicking] = useState(false)
  const inRange = useMemo(() => (rows.length ? rows.filter((r) => now - r.at <= Number(range) * 60_000) : empty), [rows, range, now])
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
  const line = (r: Entry) => `${clock(r.at)} ${name[r.level].toUpperCase()} ${r.source} ${r.wire} ${r.fn} ${r.ms ?? '-'}ms ${r.trace} ${r.text}`
  const copy = (value: string) => void navigator.clipboard?.writeText(value).catch(() => undefined)
  const clear = globalFilter || columnFilters.length > 0
  const from = pagination.pageIndex * pagination.pageSize

  return (
    <Page gap="snug">
      <PageHead crumb="While building" title="Building logs" text="What your app is saying while you build it. Click a line to see all of it." size="lead" />

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1 basis-72">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Search messages, functions and trace IDs" aria-label="Search messages, functions and trace IDs" className="h-11.5 rounded-full pl-11" />
        </label>
        <Segmented label="Level" value={filter('level')} options={sample.levels.map(([id, t]) => [id, id === 'all' ? t : `${t} ${count(id as Level)}`])} onChange={(v) => setFilter('level', v)} />
        <Segmented
          label="Source"
          value={filter('source')}
          options={[
            ['all', 'Everywhere'],
            ['Server', 'Server'],
            ['Website', 'Website'],
          ]}
          onChange={(v) => setFilter('source', v)}
        />
        <Segmented label="Time range" value={range} options={sample.ranges} onChange={setRange} />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[14px] text-ink-2">
        <label className="flex items-center gap-2.5 font-semibold text-foreground">
          <Switch checked={live} onCheckedChange={setLive} aria-label="Live" />
          Live
          {live ? <i className="size-2 animate-pulse rounded-full bg-hero" data-hue="teal" aria-hidden="true" /> : null}
        </label>
        {filter('trace') !== 'all' ? (
          <Button variant="selected" size="compact" onClick={() => setFilter('trace', 'all')}>
            Trace {filter('trace')} ✕
          </Button>
        ) : null}
        <span>{found.length === 0 ? '0 lines' : `${from + 1} to ${from + pageRows.length} of ${found.length} lines`}</span>
        {clear ? (
          <Button
            variant="bordered"
            size="compact"
            onClick={() => {
              setGlobalFilter('')
              setColumnFilters([])
            }}
          >
            Clear filters
          </Button>
        ) : null}
        <span className="ml-auto flex gap-2">
          <span className="relative" onKeyDown={(e) => e.key === 'Escape' && setPicking(false)}>
            <Button variant="bordered" size="compact" aria-expanded={picking} aria-haspopup="true" onClick={() => setPicking((v) => !v)}>
              <Columns3 /> Columns
            </Button>
            {picking ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPicking(false)} aria-hidden="true" />
                <div role="group" aria-label="Show columns" className="absolute right-0 z-20 mt-2 flex w-56 flex-col gap-0.5 rounded-[18px] border border-border bg-popover p-2 text-popover-foreground shadow-lg">
                  {table.getAllLeafColumns().filter((c) => c.getCanHide()).map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[15px] hover:bg-accent">
                      <input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()} className="size-4 accent-primary" />
                      {String(c.columnDef.header)}
                    </label>
                  ))}
                  <Button variant="bordered" size="compact" className="mt-1" onClick={() => setVisibility({})}>
                    Show all
                  </Button>
                </div>
              </>
            ) : null}
          </span>
          <Button variant="bordered" size="compact" onClick={() => copy(found.map((r) => line(r.original)).join('\n'))}>
            <Copy /> Copy
          </Button>
          <Button variant="bordered" size="compact" onClick={() => say('Download these lines as a file')}>
            <Download /> Download
          </Button>
        </span>
      </div>

      <div className="overflow-x-auto rounded-[22px] border border-border bg-card">
        <table className="w-full min-w-240 table-fixed border-collapse text-left">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-border text-[13px] text-muted-foreground uppercase">
                {group.headers.map((h) => {
                  const dir = h.column.getIsSorted()
                  return (
                    <th key={h.id} scope="col" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined} className={`${widths[h.column.id] ?? ''} px-3 py-3 font-semibold first:pl-4`}>
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
                    <td key={cell.id} className="px-3 py-2.5 first:pl-4">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() ? (
                  <tr className="border-b border-border bg-secondary/40 last:border-0">
                    <td />
                    <td colSpan={table.getVisibleLeafColumns().length - 1} className="px-3 py-4">
                      <code className="block font-mono text-[13px] leading-[1.6] break-words whitespace-pre-wrap">{row.original.text}</code>
                      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-[13px] text-ink-2">
                        <div className="flex gap-1.5"><dt>When</dt><dd className="font-semibold text-foreground">4 Oct 2026, {clock(row.original.at)}</dd></div>
                        <div className="flex gap-1.5"><dt>Source</dt><dd className="font-semibold text-foreground">{row.original.source}</dd></div>
                        <div className="flex gap-1.5"><dt>Type</dt><dd className="font-mono font-semibold text-foreground">{row.original.wire}</dd></div>
                        <div className="flex gap-1.5"><dt>Duration</dt><dd className="font-semibold text-foreground">{row.original.ms} ms</dd></div>
                        <div className="flex gap-1.5"><dt>Function</dt><dd className="font-mono font-semibold text-foreground">{row.original.fn}</dd></div>
                        <div className="flex gap-1.5"><dt>Trace ID</dt><dd className="font-mono font-semibold text-foreground">{row.original.trace}</dd></div>
                        <div className="flex gap-1.5"><dt>Line</dt><dd className="font-semibold text-foreground">#{row.original.id}</dd></div>
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.original.level !== 'info' ? (
                          <Button variant="default" size="compact" onClick={() => say(`Please fix this problem: ${row.original.text}`)}>
                            Ask Pikku to fix
                          </Button>
                        ) : null}
                        <Button variant="bordered" size="compact" onClick={() => setFilter('trace', row.original.trace)}>
                          <Search /> Everything in this trace
                        </Button>
                        <Button variant="bordered" size="compact" onClick={() => copy(row.original.trace)}>
                          <Copy /> Copy trace ID
                        </Button>
                        <Button variant="bordered" size="compact" onClick={() => copy(line(row.original))}>
                          <Copy /> Copy line
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
          <p className="px-5 py-10 text-center text-[15px] text-muted-foreground">{inRange.length === 0 ? 'No messages yet. Your app’s messages show up once it is running.' : 'No lines match. Try a wider time range or clear the filters.'}</p>
        ) : null}
      </div>

      {table.getPageCount() > 1 ? (
        <div className="flex items-center justify-center gap-3 text-[14px] text-ink-2">
          <Button variant="bordered" size="compact" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            <ChevronLeft /> Previous
          </Button>
          <span>
            Page {pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button variant="bordered" size="compact" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            Next <ChevronRight />
          </Button>
        </div>
      ) : null}
    </Page>
  )
}
