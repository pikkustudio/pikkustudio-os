import { useSearch } from '@tanstack/react-router'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { CardsSkeleton } from '../blocks/QueryState'

type ProjectApp = { slug: string; url: string | null; state: 'starting' | 'ready' | 'failed' }

export function PrototypeScreen() {
  const key = useProjectKey()
  const { path } = useSearch({ strict: false }) as { path?: string }
  const apps = usePikkuQuery('studio:projectApps', { key }, { enabled: !!key, refetchInterval: 2000 })
  if (!apps.data) return <CardsSkeleton count={1} />
  const prototype = (apps.data as ProjectApp[]).find((a) => a.slug.startsWith('prototype-'))
  if (!prototype) return <Note title="No prototype in this project" text="This project was made before prototypes existed." />
  if (prototype.state === 'failed') return <Note title="The prototype stopped" text="Its log has the reason. Ask Pikku to start it again." />
  if (prototype.state !== 'ready' || !prototype.url) return <Note title="Getting the prototype ready" text="This takes a few seconds." />
  return <iframe title="Prototype" src={`${prototype.url}${path ?? '/'}`} className="block size-full border-0 bg-white" />
}

const Note = ({ title, text }: { title: string; text: string }) => (
  <div className="m-auto flex max-w-md flex-col gap-2 p-8 text-center">
    <b className="text-lg">{title}</b>
    <p className="text-muted-foreground">{text}</p>
  </div>
)
