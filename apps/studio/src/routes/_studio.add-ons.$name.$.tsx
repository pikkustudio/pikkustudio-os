import { createFileRoute } from '@tanstack/react-router'
import { AddonIframe } from '@/addon-ui/AddonIframe'

export const Route = createFileRoute('/_studio/add-ons/$name/$')({
  component: function AddonFrameRoute() {
    const { name, _splat } = Route.useParams()
    return <AddonIframe key={name} addon={name} path={`/${_splat ?? ''}`} />
  },
})
