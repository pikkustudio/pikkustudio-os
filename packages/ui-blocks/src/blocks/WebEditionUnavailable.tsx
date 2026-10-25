import type { FunctionComponent } from 'react'
import { STUDIO_LOCAL } from '@/lib/env'
import { m } from '@/i18n/messages'
import type { WebUnavailable } from '../lib/web-edition'
import { Button } from '../ui/button'
import { Link } from './Link'
import { StateScreen } from './StateScreen'

export function WebEditionUnavailable({ route }: { route: WebUnavailable }) {
  return (
    <div data-testid="web-edition-unavailable" data-route={route} className="min-h-full">
      <div data-testid={`unavailable__${route}`} className="min-h-full">
      <StateScreen label={m.web_edition__label()} hue="petrol" page="not-found" title={m.web_edition__title()} why={m.web_edition__text()}>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Button asChild variant="hero" size="pageLg">
            <Link to={'/projects' as never} data-testid="web-edition-unavailable__projects">{m.web_edition__projects()}</Link>
          </Button>
        </div>
      </StateScreen>
      </div>
    </div>
  )
}

/** The real screen on the local edition; the "not available" screen on the web edition. */
export function localScreen(route: WebUnavailable, Real: FunctionComponent): FunctionComponent {
  return STUDIO_LOCAL ? Real : function Unavailable() { return <WebEditionUnavailable route={route} /> }
}
