import { createFileRoute } from '@tanstack/react-router'
import { RoutineScreen } from '@pikkustudio/blocks/screens/RoutineScreen'

export const Route = createFileRoute('/_studio/routines/$id')({ component: Routine })

function Routine() {
  const { id } = Route.useParams()
  return <RoutineScreen id={id} />
}
