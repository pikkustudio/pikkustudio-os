import type { ReactNode } from 'react'
import { useSearch } from '@tanstack/react-router'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { CardsSkeleton } from '../blocks/QueryState'
import { Button } from '../ui/button'

type ProjectApp = { slug: string; url: string | null; state: 'starting' | 'ready' | 'failed' }

export function PrototypeScreen() {
  const key = useProjectKey()
  const { path } = useSearch({ strict: false }) as { path?: string }
  const apps = usePikkuQuery('studio:projectApps', { key }, { enabled: !!key, refetchInterval: 2000 })
  const start = usePikkuMutation('studio:openProject', { onSuccess: () => apps.refetch() })
  if (!apps.data) return <CardsSkeleton count={1} />
  const prototype = (apps.data as ProjectApp[]).find((a) => a.slug.startsWith('prototype-'))
  if (!prototype) return (
      <Note title="The prototype is not running" text="Start the project to see it. Projects made before prototypes existed have none.">
        <Button size="compact" type="button" disabled={start.isPending} onClick={() => start.mutate({ key } as never)}>
          Start it
        </Button>
      </Note>
    )
  if (prototype.state === 'failed') return <Note title="The prototype stopped" text="Its log has the reason. Ask Pikku to start it again." />
  if (prototype.state !== 'ready' || !prototype.url) return <Note title="Getting the prototype ready" text="This takes a few seconds." />
  return <iframe title="Prototype" src={`${prototype.url}${path ?? '/'}`} className="block size-full border-0 bg-white" />
}

const Note = ({ title, text, children }: { title: string; text: string; children?: ReactNode }) => (
  <div className="m-auto flex max-w-md flex-col gap-2 p-8 text-center">
    <b className="text-lg">{title}</b>
    <p className="text-muted-foreground">{text}</p>
    {children}
  </div>
)
