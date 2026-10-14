import { createFileRoute } from '@tanstack/react-router'
import { ReviewScreen } from '@pikkustudio/blocks/screens/ReviewScreen'

export const Route = createFileRoute('/_studio/review')({ component: () => <ReviewScreen subject="code" /> })
