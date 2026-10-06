import { PageHead } from '../blocks/PageHead'
import { ChangesTimeline } from '../directions-changes/ChangesTimeline'

export function ChangesDirectionsScreen() {
  return (
    <div className="flex flex-col gap-6">
      <PageHead crumb="Changes" title="Changes" text="Everything Pikku is changing in your app, grouped by what it is for." />
      <div className="flex items-start gap-6">
        <ChangesTimeline />
      </div>
    </div>
  )
}
