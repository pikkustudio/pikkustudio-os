import type { Project } from '../blocks/ProjectCard'

export const projectCards: Project[] = [
  { id: 'nothing', name: 'Spring campaign', summary: '', look: 'garden', state: 'paused', workspaces: { local: 0, cloud: 0 } },
  { id: 'idle', name: 'Recipe box', summary: '', look: 'bakery', state: 'paused', workspaces: { local: 1, cloud: 0 }, live: null },
  { id: 'running', name: 'Booking page', summary: '', look: 'kiln', state: 'running', when: '2 hours ago', workspaces: { local: 1, cloud: 0 }, live: null },
  { id: 'working', name: 'Club newsletter', summary: '', look: 'dog', state: 'progress', workspaces: { local: 1, cloud: 1 }, live: null },
  { id: 'asleep', name: 'Open day signup', summary: '', look: 'garden', state: 'paused', workspaces: { local: 0, cloud: 1 }, live: null },
  { id: 'live', name: 'Bakery shop', summary: '', look: 'bakery', state: 'live', workspaces: { local: 1, cloud: 1 }, live: { places: 2 } },
  { id: 'problem', name: 'Pottery classes', summary: '', look: 'kiln', state: 'running', workspaces: { local: 1, cloud: 1 }, live: { places: 1 }, attention: 2 },
  { id: 'team', name: 'Dog walking rota', summary: '', look: 'dog', state: 'running', workspaces: { local: 0, cloud: 1 }, live: { places: 1 }, workingNow: ['Sam'] },
  { id: 'many', name: 'Festival site', summary: '', look: 'garden', state: 'running', workspaces: { local: 3, cloud: 4 }, live: { places: 3 }, attention: 1, workingNow: ['Sam', 'Ana', 'Lee'] },
]
