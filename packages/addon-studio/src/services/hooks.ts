import type { StudioProject } from './projects.js'

export class StudioHooks {
  private listeners: Array<() => unknown> = []
  private decorators: Array<(project: StudioProject) => Record<string, unknown>> = []

  onChange(listener: () => unknown) {
    this.listeners.push(listener)
  }

  decorateProjects(decorator: (project: StudioProject) => Record<string, unknown>) {
    this.decorators.push(decorator)
  }

  private responders: Array<(response: Response) => Response> = []

  wrapProxied(wrapper: (response: Response) => Response) {
    this.responders.push(wrapper)
  }

  proxied(response: Response) {
    return this.responders.reduce((current, wrapper) => wrapper(current), response)
  }

  changed() {
    for (const listener of this.listeners) {
      void Promise.resolve()
        .then(listener)
        .catch(() => {})
    }
  }

  decorate(project: StudioProject) {
    return this.decorators.reduce<StudioProject & Record<string, unknown>>(
      (current, decorator) => ({ ...current, ...decorator(project) }),
      { ...project }
    )
  }
}
