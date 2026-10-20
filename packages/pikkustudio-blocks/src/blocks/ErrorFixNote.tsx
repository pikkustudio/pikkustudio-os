import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { ErrorFix } from '../lib/error-fix'
import { Button } from '../ui/button'
import { Link } from './Link'

// A refusal that names the screen that sorts it out: the reason as the server gave it, and a button there.
export function ErrorFixNote({ fix }: { fix: ErrorFix }) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="error-fix">
      <span>{asI18n(fix.text)}</span>
      <Button asChild variant="bordered" size="chip">
        <Link to={fix.fix as never}>{m.builder_chat__fix_it()}</Link>
      </Button>
    </div>
  )
}
