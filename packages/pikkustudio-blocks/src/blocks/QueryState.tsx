import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorState } from './ErrorState'

export function QueryState<T>({ query, skeleton, empty, children }: { query: UseQueryResult<T>; skeleton: ReactNode; empty?: (data: T) => ReactNode | null; children: (data: T) => ReactNode }) {
  if (query.isPending) return <div role="status" aria-busy="true">{skeleton}</div>
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
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
