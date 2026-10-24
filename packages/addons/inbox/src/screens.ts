import { definePlugin } from '@pikku/core/addon'

export default definePlugin({
  title: 'inbox_addon__title',
  screens: [
    {
      path: '/inbox',
      title: 'inbox_inbox__title',
      scope: 'project',
      scopes: ['inbox:read'],
      component: () => import('./screens/Inbox.js'),
    },
    {
      path: '/inbox/:messageId',
      title: 'inbox_message__title',
      scope: 'project',
      scopes: ['inbox:read'],
      component: () => import('./screens/Inbox.js'),
    },
  ],
})
