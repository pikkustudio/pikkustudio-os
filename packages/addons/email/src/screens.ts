import { defineScreens } from '@pikku/core/addon'

export default defineScreens({
  title: 'Email',
  screens: [
    {
      path: '/',
      title: 'Email',
      scopes: ['email:read'],
      component: () => import('./screens/Inbox.js'),
    },
  ],
})
