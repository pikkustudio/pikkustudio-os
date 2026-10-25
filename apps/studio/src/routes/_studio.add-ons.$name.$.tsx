import { createFileRoute } from '@tanstack/react-router'
import { AddonIframe } from '@/addon-ui/AddonIframe'
import { localScreen } from '@pikkustudio/blocks/blocks/WebEditionUnavailable'

function AddonFrameRoute() {
  const { name, _splat } = Route.useParams()
  return <AddonIframe key={name} addon={name} path={`/${_splat ?? ''}`} />
}

export const Route = createFileRoute('/_studio/add-ons/$name/$')({ component: localScreen('add-ons', AddonFrameRoute) })
