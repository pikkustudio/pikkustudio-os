import { createFileRoute } from '@tanstack/react-router'
import { PublishScreen } from '@pikkustudio/blocks/screens/PublishScreen'

export const Route = createFileRoute('/_studio/publish')({ component: PublishScreen })
