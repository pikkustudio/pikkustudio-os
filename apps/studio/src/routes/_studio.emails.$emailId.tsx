import { createFileRoute } from '@tanstack/react-router'
import { EmailsScreen } from '@pikkustudio/blocks/screens/EmailsScreen'

export const Route = createFileRoute('/_studio/emails/$emailId')({ component: EmailsScreen })
