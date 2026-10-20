import { test, expect } from 'bun:test'
import { studioMetaSource, studioUiSource, type ReviewProjects } from './review-sources.js'

const projects = (over: Partial<ReviewProjects> = {}, asked: string[] = []): ReviewProjects => ({
  projectMeta: async (key) => {
    asked.push(key)
    return { hello: { pikkuFuncId: 'hello' } }
  },
  projectUiFiles: async (key) => {
    asked.push(key)
    return [{ path: 'apps/app/src/Home.tsx', content: 'export function Home() {\n  return <div>Hi</div>\n}\n' }]
  },
  ...over,
})

test("reads the project's meta by its full key, so a source's project is read from the workspace it names", async () => {
  const asked: string[] = []
  const meta = await studioMetaSource(projects({}, asked)).read({ projectId: 'host:p1@ws', gitSha: null })
  expect(meta).toEqual({ hello: { pikkuFuncId: 'hello' } } as never)
  expect(asked).toEqual(['host:p1@ws'])
})

test('returns null for no project, a project not built yet, or one this computer does not know', async () => {
  expect(await studioMetaSource(projects()).read({ projectId: null, gitSha: null })).toBeNull()
  expect(await studioMetaSource(projects({ projectMeta: async () => null })).read({ projectId: 'p1', gitSha: null })).toBeNull()
  const unknown = projects({
    projectMeta: async () => {
      throw new Error('Add the project to Studio before opening it')
    },
  })
  expect(await studioMetaSource(unknown).read({ projectId: 'nope', gitSha: null })).toBeNull()
})

test("a source's workspace that fails is an error, not an empty review", async () => {
  const failing = projects({
    projectMeta: async () => {
      throw new Error('The workspace answered 500')
    },
    projectUiFiles: async () => {
      throw new Error('The workspace answered 500')
    },
  })
  await expect(studioMetaSource(failing).read({ projectId: 'host:p1@ws', gitSha: null })).rejects.toThrow('answered 500')
  await expect(studioUiSource(failing).read({ projectId: 'host:p1@ws', gitSha: null })).rejects.toThrow('answered 500')
})

test("scans the project's frontend source for Review's screens; none is null", async () => {
  const asked: string[] = []
  const ui = await studioUiSource(projects({}, asked)).read({ projectId: 'host:p1@ws', gitSha: null })
  expect(Object.values(ui ?? {}).map((e) => e.name)).toContain('Home')
  expect(asked).toEqual(['host:p1@ws'])
  expect(await studioUiSource(projects({ projectUiFiles: async () => [] })).read({ projectId: 'p1', gitSha: null })).toBeNull()
})
