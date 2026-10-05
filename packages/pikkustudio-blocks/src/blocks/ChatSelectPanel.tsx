import { m } from '@/i18n/messages'
import { MousePointer2 } from 'lucide-react'
import { HintRow } from './HintRow'
import { InspectorSection } from './InspectorSection'

export function ChatSelectPanel({ attached }: { attached: string[] }) {
  return (
    <>
      <HintRow icon={MousePointer2}>{m.chat_select_panel__click_anything_in_the()}</HintRow>
      {attached.length ? (
        <InspectorSection title={m.chat_select_panel__attached_to_your_chat()}>
          <ul className="list-disc pl-4.5 text-px145 leading-[1.7]">
            {attached.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </InspectorSection>
      ) : null}
    </>
  )
}
