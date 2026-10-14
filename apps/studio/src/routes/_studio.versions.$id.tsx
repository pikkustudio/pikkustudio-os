import { createFileRoute } from '@tanstack/react-router'
import { VersionScreen } from '@pikkustudio/blocks/screens/VersionScreen'

export const Route = createFileRoute('/_studio/versions/$id')({ component: Version })

function Version() {
  const { id } = Route.useParams()
  return <VersionScreen id={id} />
}
