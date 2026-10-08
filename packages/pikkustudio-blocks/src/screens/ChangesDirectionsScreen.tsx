import { m } from '@/i18n/messages'
import { PageHead } from '../blocks/PageHead'
import { ChangesTimeline } from '../directions-changes/ChangesTimeline'

export function ChangesDirectionsScreen() {
  return (
    <div className="flex flex-col gap-6">
      <PageHead crumb={m.changes_directions__title()} title={m.changes_directions__title()} text={m.changes_directions__text()} />
      <div className="flex items-start gap-6">
        <ChangesTimeline />
      </div>
    </div>
  )
}
