import { useContext, useState, type ReactNode } from 'react'
import { ShellCtx } from '../lib/shell'
import { PinButton } from '../blocks/PinButton'
import { SlidersHorizontal } from 'lucide-react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { PreviewBar } from '../blocks/PreviewBar'
import { CardsSkeleton } from '../blocks/QueryState'
import { Button } from '../ui/button'
import type { Device } from '../types/designTypes'

const WIDTH: Record<Device, string> = { computer: '100%', tablet: '820px', phone: '390px' }

type ProjectApp = { slug: string; url: string | null; state: 'starting' | 'ready' | 'failed' }

export function PrototypeScreen() {
  const key = useProjectKey()
  const { path } = useSearch({ strict: false }) as { path?: string }
  const navigate = useNavigate()
  const shell = useContext(ShellCtx)
  const [device, setDevice] = useState<Device>('computer')
  const [reload, setReload] = useState(0)
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
  return (
    <div className="flex size-full flex-col gap-3">
      <PreviewBar
        app="app"
        page={path ?? '/'}
        groups={[{ app: 'app', label: 'Your app', pages: [{ id: '/', name: 'Home', text: 'The first page people see' }, ...(path && path !== '/' ? [{ id: path, name: path, text: 'The page you are on' }] : [])] }]}
        device={device}
        tool="none"
        tools={[]}
        noun="Page"
        label="Prototype"
        onPick={(_, p) => navigate({ to: '.', search: ((s: Record<string, unknown>) => ({ ...s, path: p === '/' ? undefined : p })) as never })}
        onDevice={setDevice}
        onTool={() => {}}
        onReload={() => setReload((k) => k + 1)}
        actions={
          <>
          <PinButton variant="bar" />
          <Button variant="bar" size="bar" type="button" aria-label="Options" title="Options" onClick={() => shell.open('options')}>
            <SlidersHorizontal className="size-4.5" />
          </Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1 justify-center">
        <iframe key={reload} title="Prototype" src={`${prototype.url}${path ?? '/'}`} style={{ width: WIDTH[device] }} className="block h-full max-w-full rounded-2xl border border-border bg-white" />
      </div>
    </div>
  )
}

const Note = ({ title, text, children }: { title: string; text: string; children?: ReactNode }) => (
  <div className="m-auto flex max-w-md flex-col gap-2 p-8 text-center">
    <b className="text-lg">{title}</b>
    <p className="text-muted-foreground">{text}</p>
    {children}
  </div>
)
