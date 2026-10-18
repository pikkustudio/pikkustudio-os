import { m } from '@/i18n/messages'
import { Segmented } from './Segmented'

export type EmailsTab = 'templates' | 'inbox'

export function EmailTabs({ tab, onTab }: { tab: EmailsTab; onTab: (tab: EmailsTab) => void }) {
  return (
    <div>
      <Segmented
        label={m.email_tabs__label()}
        value={tab}
        onChange={(v) => onTab(v as EmailsTab)}
        options={[
          ['templates', m.email_tabs__templates()],
          ['inbox', m.email_tabs__inbox()],
        ]}
      />
    </div>
  )
}
