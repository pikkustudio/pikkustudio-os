import { pikkuStudio } from '@pikku/core/addon'

export default pikkuStudio({
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
