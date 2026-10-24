import { definePlugin } from '@pikku/core/addon'

export default definePlugin({
  title: 'diffui__title',
  screens: [
    {
      path: '/diffui',
      title: 'diffui_home__title',
      scope: 'project',
      nav: { area: 'project', icon: 'columns-2', order: 100 },
      scopes: ['diffui:read'],
      component: () => import('./screens/Home.js'),
    },
  ],
})
