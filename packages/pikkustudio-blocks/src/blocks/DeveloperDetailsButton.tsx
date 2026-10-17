import { m } from '@/i18n/messages'
import { CodeXml } from 'lucide-react'
import { Button } from '../ui/button'
import { useDeveloperDetails } from '../lib/developer-details'

export function DeveloperDetailsButton() {
  const [on, setOn] = useDeveloperDetails()
  const label = on ? m.developer_details__hide() : m.developer_details__show()
  return (
    <Button variant="bordered" size="compactTight" type="button" aria-pressed={on} aria-label={label} title={label} onClick={() => setOn(!on)} className="aria-pressed:border-muted-foreground aria-pressed:bg-secondary">
      <CodeXml className="size-4.5" />
    </Button>
  )
}
