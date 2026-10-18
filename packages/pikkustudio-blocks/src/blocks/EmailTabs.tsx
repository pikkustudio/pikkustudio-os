import { m } from '@/i18n/messages'
import { Segmented } from './Segmented'

export type EmailsTab = 'templates' | 'inbox'

export function EmailTabs({ tab, onTab }: { tab: EmailsTab; onTab: (tab: EmailsTab) => void }) {
  return (
    <div>
      <Segmented
        label={m.email_inbox__tabs_label()}
        value={tab}
        onChange={(v) => onTab(v as EmailsTab)}
        options={[
          ['templates', m.email_inbox__tab_templates()],
          ['inbox', m.email_inbox__tab_inbox()],
        ]}
      />
    </div>
  )
}
