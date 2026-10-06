import { PageHead } from '../blocks/PageHead'
import { TimelineMain } from '../directions-changes/B'

export function ChangesDirectionsScreen() {
  return (
    <div className="flex flex-col gap-6">
      <PageHead crumb="Changes" title="Changes" text="The life of your app as a story, newest first. Pick one to talk about it." />
      <div className="flex items-start gap-6">
        <TimelineMain />
      </div>
    </div>
  )
}
