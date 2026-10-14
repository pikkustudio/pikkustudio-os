import { createFileRoute } from '@tanstack/react-router'
import { ReviewFixesScreen } from '@pikkustudio/blocks/screens/ReviewFixesScreen'

export const Route = createFileRoute('/_studio/review-fixes')({ component: ReviewFixesScreen })
