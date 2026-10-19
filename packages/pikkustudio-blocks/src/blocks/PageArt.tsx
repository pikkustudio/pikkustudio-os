import { useMemo } from 'react'
import { characterFor } from '@pikkustudio/blob/characters'
import { Blob } from './Blob'

export function PageArt({ page, size = 280 }: { page: string; size?: number }) {
  const pose = useMemo(() => characterFor(page), [page])
  return (
    <div className="absolute inset-0 grid place-items-center text-hero-ink" aria-hidden="true">
      <Blob pose={pose} size={size} />
    </div>
  )
}
