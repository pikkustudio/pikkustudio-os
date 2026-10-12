import { Blob, type BlobPoseName, type BlobProps } from '@pikku/blob-studio'
import { BLOB_LOGO } from '../lib/blobPoses'

export { Blob }
export type { BlobPoseName, BlobProps }

const dimension = (size?: number | string) => (size === undefined ? undefined : typeof size === 'number' ? `${size}px` : size)

export function BlobMark({ size, title, className, style }: Pick<BlobProps, 'size' | 'title' | 'className' | 'style'>) {
  const dim = dimension(size)
  return (
    <svg
      viewBox="0 0 100 100"
      width={dim}
      height={dim}
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={BLOB_LOGO.d} fill="none" stroke="currentColor" strokeWidth={BLOB_LOGO.strokeWidth} strokeLinejoin="round" />
      <circle cx={BLOB_LOGO.dot.cx} cy={BLOB_LOGO.dot.cy} r={BLOB_LOGO.dot.r} fill="currentColor" />
    </svg>
  )
}
