import type { I18nNode, I18nString } from '@pikku/react'
import { Card, CardContent } from '../ui/card'

export function StatCard({ label, value, note, testId }: { label: I18nString; value?: I18nNode; note?: I18nString; testId?: string }) {
  return (
    <Card data-testid={testId ?? 'stat-card'}>
      <CardContent>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
