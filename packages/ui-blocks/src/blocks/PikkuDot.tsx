import { Blob, type BlobPoseName } from './Blob'

/**
 * Pikku's small mark, for buttons and "Pikku says" lines. It is sized in em, so it grows with the text it sits beside.
 * A pose draws the blob under half as wide as its canvas, so the canvas is larger than the mark and pulled in with negative
 * margins. Fix buttons use the spanner pose.
 */
export function PikkuDot({ className = '', pose = 'blob' }: { className?: string; pose?: BlobPoseName }) {
  return <Blob pose={pose} className={`-m-[0.62em] size-[2.7em] shrink-0 ${className}`} aria-hidden="true" />
}
