import { defineScreens } from '@pikku/core/addon'

export default defineScreens({
  title: 'Inbox',
  screens: [
    {
      path: '/inbox',
      title: 'Inbox',
      scopes: ['inbox:read'],
      component: () => import('./screens/Inbox.js'),
    },
  ],
})
