import { m } from '@/i18n/messages'
import { MousePointer2 } from 'lucide-react'
import type { Attachment } from '../lib/shell'
import { HintRow } from './HintRow'
import { InspectorSection } from './InspectorSection'

export function ChatSelectPanel({ attached }: { attached: Attachment[] }) {
  return (
    <>
      <HintRow icon={MousePointer2}>{m.chat_select_panel__click_anything_in_the()}</HintRow>
      {attached.length ? (
        <InspectorSection title={m.chat_select_panel__attached_to_your_chat()}>
          <ul className="flex flex-col gap-1.5 text-px145 leading-[1.7]">
            {attached.map((a) => (
              <li key={a.label} className="flex items-start gap-2">
                <span className="mt-2.5 size-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
                {a.text}
              </li>
            ))}
          </ul>
        </InspectorSection>
      ) : null}
    </>
  )
}
