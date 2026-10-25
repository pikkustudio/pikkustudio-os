import { m } from '@/i18n/messages'

export const ASK_TONE = {
  info: { box: 'border-info', ic: 'bg-info text-white', label: 'text-info-foreground', hover: 'hover:border-info', badge: 'group-hover:bg-info group-hover:text-white', title: m.shell_layout__question_for_you },
  attention: { box: 'border-warning', ic: 'bg-warning text-on-warning', label: 'text-warning-foreground', hover: 'hover:border-warning', badge: 'group-hover:bg-warning group-hover:text-on-warning', title: m.shell_layout__question_needs_you },
  danger: { box: 'border-destructive', ic: 'bg-destructive text-white', label: 'text-destructive-foreground', hover: 'hover:border-destructive', badge: 'group-hover:bg-destructive group-hover:text-white', title: m.shell_layout__question_careful },
}

