import { createFileRoute } from '@tanstack/react-router'
import { ContentScreen } from '@pikkustudio/blocks/screens/ContentScreen'

export const Route = createFileRoute('/_studio/content')({ component: ContentScreen })
