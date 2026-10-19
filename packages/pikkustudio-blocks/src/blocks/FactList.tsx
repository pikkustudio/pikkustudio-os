import type { I18nString } from '@pikku/react'
import { Card, CardContent } from '../ui/card'

export function FactList({ rows, testId }: { rows: { label: I18nString; value: I18nString; testId?: string }[]; testId?: string }) {
  return (
    <Card data-testid={testId ?? 'fact-list'}>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-1">
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd data-testid={r.testId} className="font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
