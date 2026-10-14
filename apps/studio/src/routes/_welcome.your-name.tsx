import { createFileRoute } from '@tanstack/react-router'
import { OnbNameScreen } from '@pikkustudio/blocks/screens/OnbNameScreen'

export const Route = createFileRoute('/_welcome/your-name')({ component: OnbNameScreen })
