import { defineScreens } from '@pikku/core/addon'

export default defineScreens({
  title: 'Diff UI',
  screens: [
    {
      path: '/',
      title: 'Diff UI',
      nav: true,
      scopes: ['diffui:read'],
      component: () => import('./screens/Home.js'),
    },
  ],
})
