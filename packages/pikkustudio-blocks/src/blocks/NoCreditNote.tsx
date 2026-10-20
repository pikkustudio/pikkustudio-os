import { m } from '@/i18n/messages'
import type { NoCredit } from '../lib/no-credit'
import { Button } from '../ui/button'
import { Link } from './Link'

// The cloud refused the builder's AI for want of credit: say so in the person's language, with the team's billing page.
export function NoCreditNote({ noCredit }: { noCredit: NoCredit }) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="no-credit">
      <span>{m.builder_chat__no_credit({ org: noCredit.org })}</span>
      {noCredit.fix ? (
        <Button asChild variant="bordered" size="chip">
          <Link to={noCredit.fix as never}>{m.builder_chat__add_credit()}</Link>
        </Button>
      ) : null}
    </div>
  )
}
