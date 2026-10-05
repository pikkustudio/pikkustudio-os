import { defineScreens } from '@pikku/core/addon'

export default defineScreens({
  title: 'Spindle',
  screens: [
    { path: '/', title: 'Library', nav: true, scopes: ['spindle:read'], component: () => import('./screens/Library.js') },
    { path: '/search', title: 'Search', nav: true, scopes: ['spindle:read'], component: () => import('./screens/Search.js') },
    { path: '/collections', title: 'Collections', nav: true, scopes: ['spindle:read'], component: () => import('./screens/Collections.js') },
    { path: '/collections/new', title: 'New collection', scopes: ['spindle:write'], component: () => import('./screens/NewCollection.js') },
    { path: '/collections/:kbId', title: 'Collection', scopes: ['spindle:read'], component: () => import('./screens/Collection.js') },
    { path: '/suggestions', title: 'Suggestions', nav: true, scopes: ['spindle:read'], component: () => import('./screens/Suggestions.js') },
    { path: '/files/:assetId', title: 'File', scopes: ['spindle:read'], component: () => import('./screens/Asset.js') },
  ],
})
