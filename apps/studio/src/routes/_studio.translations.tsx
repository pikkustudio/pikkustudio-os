import { createFileRoute } from '@tanstack/react-router'
import { TranslationsScreen } from '@pikkustudio/blocks/screens/TranslationsScreen'

export const Route = createFileRoute('/_studio/translations')({ component: TranslationsScreen })
