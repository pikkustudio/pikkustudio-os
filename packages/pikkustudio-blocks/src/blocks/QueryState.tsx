import { m } from '@/i18n/messages'
import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Button } from '../ui/button'
import { EmptyState } from './EmptyState'

export function QueryState<T>({ query, skeleton, empty, children }: { query: UseQueryResult<T>; skeleton: ReactNode; empty?: (data: T) => ReactNode | null; children: (data: T) => ReactNode }) {
  if (query.isPending) return <div role="status" aria-busy="true">{skeleton}</div>
  if (query.isError)
    return (
      <EmptyState layout="row" title={m.query_state__that_did_not_load()} text={m.query_state__something_went_wrong_on()}>
        <Button variant="bordered" size="page" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
          
          {m.query_state__try_again()}
        </Button>
      </EmptyState>
    )
  return <>{empty?.(query.data) ?? children(query.data)}</>
}

export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 @min-[640px]:grid-cols-2 @min-[960px]:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-card border border-border bg-secondary" />
      ))}
    </div>
  )
}
