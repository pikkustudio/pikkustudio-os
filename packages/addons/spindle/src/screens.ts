import { pikkuStudio } from '@pikku/core/addon'

export default pikkuStudio({
  title: 'spindle__title',
  screens: [
    { path: '/spindle', title: 'spindle_library__title', scope: 'project', nav: { area: 'project', icon: 'library', order: 10 }, scopes: ['spindle:read'], component: () => import('./screens/Library.js') },
    { path: '/spindle/search', title: 'spindle_search__title', scope: 'project', nav: { area: 'project', icon: 'search', order: 20 }, scopes: ['spindle:read'], component: () => import('./screens/Search.js') },
    { path: '/spindle/collections', title: 'spindle_collections__title', scope: 'project', nav: { area: 'project', icon: 'folders', order: 30 }, scopes: ['spindle:read'], component: () => import('./screens/Collections.js') },
    { path: '/spindle/collections/new', title: 'spindle_new_collection__title', scope: 'project', scopes: ['spindle:write'], component: () => import('./screens/NewCollection.js') },
    { path: '/spindle/collections/:kbId', title: 'spindle_collection__title', scope: 'project', scopes: ['spindle:read'], component: () => import('./screens/Collection.js') },
    { path: '/spindle/suggestions', title: 'spindle_suggestions__title', scope: 'project', nav: { area: 'project', icon: 'lightbulb', order: 40 }, scopes: ['spindle:read'], component: () => import('./screens/Suggestions.js') },
    { path: '/spindle/files/:assetId', title: 'spindle_file__title', scope: 'project', scopes: ['spindle:read'], component: () => import('./screens/Asset.js') },
  ],
})
