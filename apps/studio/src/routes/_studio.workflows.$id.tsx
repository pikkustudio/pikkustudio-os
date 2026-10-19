import { createFileRoute } from '@tanstack/react-router'
import { WorkflowScreen } from '@pikkustudio/blocks/screens/WorkflowScreen'

export const Route = createFileRoute('/_studio/workflows/$id')({ component: Workflow })

function Workflow() {
  const { id } = Route.useParams()
  return <WorkflowScreen id={id} />
}
