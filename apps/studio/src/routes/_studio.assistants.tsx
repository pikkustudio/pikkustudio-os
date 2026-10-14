import { createFileRoute } from '@tanstack/react-router'
import { AssistantsScreen } from '@pikkustudio/blocks/screens/AssistantsScreen'

export const Route = createFileRoute('/_studio/assistants')({ component: AssistantsScreen })
