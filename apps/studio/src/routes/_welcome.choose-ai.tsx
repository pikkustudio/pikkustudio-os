import { createFileRoute } from '@tanstack/react-router'
import { ChooseAiScreen } from '@pikkustudio/blocks/screens/ChooseAiScreen'

export const Route = createFileRoute('/_welcome/choose-ai')({ component: ChooseAiScreen })
