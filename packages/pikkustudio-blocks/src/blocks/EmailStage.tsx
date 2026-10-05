import type { Device } from './EmailPreview'
import type { EmailPreviewData } from '../lib/emails'

export function EmailStage({ preview, device, reloadKey }: { preview: EmailPreviewData | undefined; device: Device; reloadKey: number }) {
  const phone = device === 'phone'
  const text = device === 'text'
  return (
    <div className="relative flex min-h-0 items-start justify-center overflow-auto rounded-card bg-surface-3 p-4.5">
      <div key={reloadKey} className={`flex h-full w-full justify-center self-start ${phone ? 'max-w-85' : 'max-w-160'}`}>
        {preview ? (
          text ? (
            <pre className="w-full rounded-lg bg-white p-7 font-mono text-[14.5px] leading-[1.65] break-words whitespace-pre-wrap text-[#1E2328] shadow-lift">{preview.text ?? preview.subject}</pre>
          ) : (
            <iframe title={preview.subject} srcDoc={preview.html} sandbox="" className={`block h-full min-h-130 w-full border-0 bg-white shadow-lift ${phone ? 'rounded-[38px] border-[9px] border-[#0E1F24]' : 'rounded-lg'}`} />
          )
        ) : null}
      </div>
    </div>
  )
}
